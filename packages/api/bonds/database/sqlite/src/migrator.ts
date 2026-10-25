/**
 * SQLite migration runner.
 *
 * Mirrors the Postgres bond's `createMigrator`, but SQLite has no server-side
 * database to provision — the file is created on first open — so there is NO
 * `CREATE DATABASE` bootstrap step. Migration files are applied with
 * better-sqlite3's `db.exec()`, which runs a file containing MULTIPLE statements
 * (a prepared statement / the pool's `query()` runs only one), so a normal
 * multi-statement `*.sql` migration applies correctly. Each file runs once: the
 * `_molecule_migrations` table records it after its statements succeed.
 *
 * @module
 */

import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when migrator.js is imported directly
// (not through the package barrel).
import './secrets.js'
import Database from 'better-sqlite3'

import { translateDdlToSqlite } from './utilities.js'

/**
 * Returns true when `err` looks like an "already exists" / duplicate-object
 * idempotency error — the class of error an `IF NOT EXISTS` migration is
 * EXPECTED to hit on a re-run. better-sqlite3 sets `.code` to the generic
 * `SQLITE_ERROR` for every one of these (no fine-grained code like Postgres's
 * SQLSTATE or mysql2's `ER_*`), so this bond can ONLY match on message text —
 * `table X already exists`, `index X already exists`, `duplicate column name: X`.
 *
 * @param err - The error thrown by `db.exec(sql)`.
 * @returns True if the error is safe to warn-and-continue past.
 */
function isIdempotencyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /already exists/i.test(msg) || /duplicate column name/i.test(msg)
}

/**
 * The tables a migration declares with `CREATE TABLE IF NOT EXISTS`, and each one's
 * column definitions (constraint clauses left out).
 *
 * @param sql - One migration file, already translated to SQLite DDL.
 * @returns `{ table, columns: [{ name, definition }] }` per declared table.
 */
function declaredTables(
  sql: string,
): { table: string; columns: { name: string; definition: string }[] }[] {
  const out: { table: string; columns: { name: string; definition: string }[] }[] = []
  const head = /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?\s*\(/gi
  for (let m = head.exec(sql); m; m = head.exec(sql)) {
    // The body runs to the parenthesis that closes the one after the name.
    let depth = 1
    let i = head.lastIndex
    const start = i
    for (; i < sql.length && depth > 0; i++) {
      if (sql[i] === '(') depth++
      else if (sql[i] === ')') depth--
    }
    // Comments out first: a comma inside `-- …` made a phantom column (flash-m39 `articles.and`).
    const body = sql
      .slice(start, i - 1)
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
    const parts: string[] = []
    let level = 0
    let current = ''
    for (const ch of body) {
      if (ch === '(') level++
      if (ch === ')') level--
      if (ch === ',' && level === 0) {
        parts.push(current)
        current = ''
      } else current += ch
    }
    parts.push(current)
    const columns = parts
      .map((p) => p.trim())
      .filter((p) => p && !/^(CONSTRAINT|PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK)\b/i.test(p))
      .map((p) => ({ name: /^["`]?([A-Za-z_][A-Za-z0-9_]*)/.exec(p)?.[1] ?? '', definition: p }))
      .filter((c) => c.name)
    out.push({ table: m[1], columns })
  }
  return out
}

/** The head of an `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` statement. */
const ADD_COLUMN_IF_NOT_EXISTS =
  /ALTER\s+TABLE\s+["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?/gi

/**
 * The `ALTER TABLE … ADD COLUMN IF NOT EXISTS …;` statements in a setup file,
 * with the span each occupies in the text.
 *
 * @param sql - The migration file as written (Postgres dialect).
 * @returns One entry per statement.
 */
function addColumnSpans(
  sql: string,
): { table: string; column: string; from: number; to: number }[] {
  const out: { table: string; column: string; from: number; to: number }[] = []
  ADD_COLUMN_IF_NOT_EXISTS.lastIndex = 0
  for (let m = ADD_COLUMN_IF_NOT_EXISTS.exec(sql); m; m = ADD_COLUMN_IF_NOT_EXISTS.exec(sql)) {
    // The statement runs to its first `;` outside a string and outside parens
    // (a `DEFAULT (…)` may hold one). No terminator means the file's end.
    let depth = 0
    let quote = ''
    let i = m.index + m[0].length
    for (; i < sql.length; i++) {
      const ch = sql[i]
      if (quote) {
        if (ch === quote) quote = ''
        continue
      }
      if (ch === "'" || ch === '"' || ch === '`') quote = ch
      else if (ch === '(') depth++
      else if (ch === ')') depth--
      else if (ch === ';' && depth === 0) break
    }
    const to = i < sql.length ? i + 1 : sql.length
    out.push({ table: m[1], column: m[2], from: m.index, to })
    ADD_COLUMN_IF_NOT_EXISTS.lastIndex = to
  }
  return out
}

/**
 * Remove the `ADD COLUMN IF NOT EXISTS` statements the database already
 * satisfies — Postgres's reading of the clause, which SQLite itself has no
 * `ADD COLUMN` form of. A statement is satisfied when the table has the column,
 * or when the table does not exist yet and this same file declares the column in
 * its own `CREATE TABLE IF NOT EXISTS` (the CREATE makes it, so the ALTER is the
 * no-op Postgres would see). A statement for a table that does not exist and that
 * the file does not create is kept, so a genuinely wrong table still fails the
 * run.
 *
 * Left in, an unsatisfied statement is what fails: translated to a bare
 * `ADD COLUMN` it hits `duplicate column name`, the file rolls back, is never
 * recorded, and warns on every boot that "nothing in this file was applied"
 * while the schema is in fact complete.
 *
 * @param db - The open database.
 * @param sql - The migration file as written.
 * @returns The file with the satisfied statements removed.
 */
function dropSatisfiedAddColumns(db: Database.Database, sql: string): string {
  const declared = new Set(
    declaredTables(sql).flatMap((t) => t.columns.map((c) => `${t.table}.${c.name}`.toLowerCase())),
  )
  let out = sql
  for (const span of addColumnSpans(sql).reverse()) {
    const key = `${span.table}.${span.column}`.toLowerCase()
    const existing = db.prepare('SELECT name FROM pragma_table_info(?)').all(span.table) as {
      name: string
    }[]
    const has =
      existing.some((c) => c.name.toLowerCase() === span.column.toLowerCase()) ||
      (existing.length === 0 && declared.has(key))
    if (has) out = out.slice(0, span.from) + out.slice(span.to)
  }
  return out
}

/** The head of an `ALTER TABLE … DROP COLUMN IF EXISTS …` statement. */
const DROP_COLUMN_IF_EXISTS =
  /ALTER\s+TABLE\s+["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?/gi

/**
 * The `ALTER TABLE … DROP COLUMN IF EXISTS …;` statements in a setup file, with
 * the span each occupies in the text — the same span reader as
 * {@link addColumnSpans}, so both honor one quoting/terminator grammar.
 *
 * @param sql - The migration file as written (Postgres dialect).
 * @returns One entry per statement.
 */
function dropColumnSpans(
  sql: string,
): { table: string; column: string; from: number; to: number }[] {
  const out: { table: string; column: string; from: number; to: number }[] = []
  DROP_COLUMN_IF_EXISTS.lastIndex = 0
  for (let m = DROP_COLUMN_IF_EXISTS.exec(sql); m; m = DROP_COLUMN_IF_EXISTS.exec(sql)) {
    // The statement runs to its first `;` outside a string and outside parens.
    // No terminator means the file's end.
    let depth = 0
    let quote = ''
    let i = m.index + m[0].length
    for (; i < sql.length; i++) {
      const ch = sql[i]
      if (quote) {
        if (ch === quote) quote = ''
        continue
      }
      if (ch === "'" || ch === '"' || ch === '`') quote = ch
      else if (ch === '(') depth++
      else if (ch === ')') depth--
      else if (ch === ';' && depth === 0) break
    }
    const to = i < sql.length ? i + 1 : sql.length
    out.push({ table: m[1], column: m[2], from: m.index, to })
    DROP_COLUMN_IF_EXISTS.lastIndex = to
  }
  return out
}

/**
 * Remove the `DROP COLUMN IF EXISTS` statements the database already satisfies —
 * Postgres's reading of the clause, which SQLite has no form of. A statement is
 * satisfied when the table has no such column: either it EXISTS without the column
 * (the drop is the no-op Postgres would perform), or this same file creates the
 * table and does not declare the column in its own `CREATE TABLE IF NOT EXISTS`
 * (by the time the DROP runs the column is absent, so Postgres no-ops too).
 *
 * This is the one that broke production. An agent repairing a column that only its
 * DEV database had (a since-deleted migration added it) wrote
 * `ALTER TABLE "usersSecrets" DROP COLUMN IF EXISTS "userId";`. In dev the column
 * existed and the drop was the fix; on the FRESH production database it never
 * existed, and SQLite rejects the clause outright (`near "EXISTS": syntax error`),
 * so the deploy crashes with `Migrations failed`.
 *
 * A statement for a table that does not exist is KEPT: Postgres refuses that too
 * (`relation … does not exist`), so a migration naming a table no file creates
 * still fails the run instead of disappearing into a no-op.
 *
 * @param db - The open database.
 * @param sql - The migration file as written.
 * @returns The file with the satisfied statements removed.
 */
function dropSatisfiedDropColumns(db: Database.Database, sql: string): string {
  // Tables this same file creates, with the columns it declares for each — the
  // absent-table branch reads the file's own intent rather than guessing.
  const declared = new Map(
    declaredTables(sql).map((t) => [
      t.table.toLowerCase(),
      new Set(t.columns.map((c) => c.name.toLowerCase())),
    ]),
  )
  let out = sql
  for (const span of dropColumnSpans(sql).reverse()) {
    const existing = db.prepare('SELECT name FROM pragma_table_info(?)').all(span.table) as {
      name: string
    }[]
    if (existing.length === 0) {
      const own = declared.get(span.table.toLowerCase())
      if (own && !own.has(span.column.toLowerCase())) {
        out = out.slice(0, span.from) + out.slice(span.to)
      }
      continue
    }
    const has = existing.some((c) => c.name.toLowerCase() === span.column.toLowerCase())
    if (!has) out = out.slice(0, span.from) + out.slice(span.to)
  }
  return out
}

/**
 * The file that CREATES each table: the first file in run order whose text declares
 * it. Ownership is what keeps a re-read OLD file from shaping a table another file
 * created — the run's own `CREATE TABLE IF NOT EXISTS` must not be a second, silent
 * author of a schema it does not own.
 *
 * @param files - The migration files in run order.
 * @param sources - Each file's text.
 * @returns Lower-cased table name → the owning file.
 */
function tableOwners(
  files: readonly string[],
  sources: ReadonlyMap<string, string>,
): Map<string, string> {
  const owners = new Map<string, string>()
  for (const file of files) {
    for (const { table } of declaredTables(sources.get(file) ?? '')) {
      const key = table.toLowerCase()
      if (!owners.has(key)) owners.set(key, file)
    }
  }
  return owners
}

/**
 * Whether SQLite can add this column definition to a table that already exists.
 * `NOT NULL` without a `DEFAULT` is refused once the table holds a row — and an
 * empty table today is not empty tomorrow, so the decision comes from the text, not
 * from whether this boot's table happens to be empty.
 *
 * @param definition - The column's definition, as declared.
 * @returns True when `ADD COLUMN <definition>` is safe.
 */
function addableColumn(definition: string): boolean {
  const def = definition.replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''")
  return !/\bNOT\s+NULL\b/i.test(def) || /\bDEFAULT\b/i.test(def)
}

/**
 * Add the columns a `CREATE TABLE IF NOT EXISTS` declares that the existing table
 * lacks — but only for tables THIS file creates. Every migration file is re-read on
 * every boot, and on a table that already exists `IF NOT EXISTS` is a silent no-op:
 * a column added to the file that created the table later never reached the database,
 * nothing said so, and the app failed on it (the live database had been hand-altered).
 * A table another file creates is NOT reconciled: that made a
 * rewritten, since-deleted old migration add `userId NOT NULL` to a package's table
 * and every insert the package's own service made failed. Additive only;
 * a column SQLite cannot add in place (a `NOT NULL` with no default, PRIMARY KEY,
 * UNIQUE) is reported, not forced.
 *
 * @param db - The open database.
 * @param sql - The migration file just applied.
 * @param file - Its name, for the log.
 * @param owners - Table → the file that creates it ({@link tableOwners}).
 */
function addMissingColumns(
  db: Database.Database,
  sql: string,
  file: string,
  owners: ReadonlyMap<string, string>,
): void {
  for (const { table, columns } of declaredTables(sql)) {
    const existing = db.prepare('SELECT name FROM pragma_table_info(?)').all(table) as {
      name: string
    }[]
    if (existing.length === 0) continue
    const have = new Set(existing.map((c) => c.name.toLowerCase()))
    const owner = owners.get(table.toLowerCase())
    if (owner !== undefined && owner !== file) {
      // Repeating the owner's CREATE is a package pattern (a setup file that adds a
      // column declares its table so the scaffold can find it, then ALTERs): say
      // nothing when the table already has every column this CREATE declares — this
      // runs after the file's own statements, so its ALTERs have landed. Only the
      // columns that would have been reconciled in are worth a word.
      const missing = columns.filter((c) => !have.has(c.name.toLowerCase())).map((c) => c.name)
      if (missing.length > 0) {
        console.warn(
          `⚠ ${file}: CREATE TABLE IF NOT EXISTS "${table}" is a no-op — ${owner} creates it, so ` +
            `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not added; ` +
            'add columns with ALTER TABLE … ADD COLUMN in a new migration',
        )
      }
      continue
    }
    for (const column of columns) {
      if (have.has(column.name.toLowerCase())) continue
      if (!addableColumn(column.definition)) {
        console.warn(
          `⚠ ${file}: ${table}.${column.name} is NOT NULL with no DEFAULT, and SQLite cannot add ` +
            'a NOT NULL column with no default to a table that already exists; add it in a new ' +
            'migration file (ALTER TABLE … ADD COLUMN with a DEFAULT)',
        )
        continue
      }
      try {
        db.exec(`ALTER TABLE "${table}" ADD COLUMN ${column.definition}`)
        console.log(`+ ${file}: added column ${table}.${column.name}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(
          `⚠ ${file}: ${table}.${column.name} is in the migration but not in the database, and SQLite cannot add it in place (${msg}); ` +
            'add it in a new migration file (ALTER TABLE … ADD COLUMN with a DEFAULT), or recreate the table',
        )
      }
    }
  }
}

/** The table that records which migration files have run. */
export const MIGRATION_LEDGER = '_molecule_migrations'

/**
 * Opens the ledger: the files already applied, and whether the table is new on a
 * database that already holds tables (one migrated before this runner kept a
 * record, so its files ran under the old every-boot rule).
 *
 * @param db - The open database.
 * @returns Applied file identities with their recorded namespace, and legacy adoption state.
 */
function openLedger(db: Database.Database): {
  applied: Map<string, string | null>
  adopting: boolean
} {
  const had = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(MIGRATION_LEDGER)
  const others = db
    .prepare(
      "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .get() as { n: number } | undefined
  db.exec(
    `CREATE TABLE IF NOT EXISTS "${MIGRATION_LEDGER}" ("file" TEXT PRIMARY KEY, "applied_at" TEXT NOT NULL, "namespace" TEXT)`,
  )
  const columns = db.prepare(`PRAGMA table_info("${MIGRATION_LEDGER}")`).all() as { name: string }[]
  if (!columns.some((column) => column.name === 'namespace')) {
    db.exec(`ALTER TABLE "${MIGRATION_LEDGER}" ADD COLUMN "namespace" TEXT`)
  }
  const rows = db.prepare(`SELECT "file", "namespace" FROM "${MIGRATION_LEDGER}"`).all() as {
    file: string
    namespace: string | null
  }[]
  return {
    applied: new Map(rows.map((r) => [r.file, r.namespace])),
    adopting: !had && (others?.n ?? 0) > 0,
  }
}

/**
 * Records a file as applied.
 *
 * @param db - The open database.
 * @param file - The migration file name.
 * @param namespace - The logical migration directory.
 */
function record(db: Database.Database, file: string, namespace: string): void {
  db.prepare(
    `INSERT OR IGNORE INTO "${MIGRATION_LEDGER}" ("file", "applied_at", "namespace") VALUES (?, ?, ?)`,
  ).run(file, new Date().toISOString(), namespace)
}

/** Stable identities for apps that apply SQL from more than one directory. */
export interface MigrationOptions {
  /** Prefix for ledger keys. Omit for the application's existing migration history. */
  namespace?: string
  /**
   * Other directories that could own a legacy bare filename. Pass the complete
   * list when upgrading old history; duplicate basenames are refused because
   * the old ledger did not record which file ran. An empty list asserts that
   * this is the only migration directory.
   */
  legacyDirectories?: readonly string[]
}

/**
 * Attribute a legacy bare key only when the caller supplied enough directory
 * evidence. New rows record their namespace, so equal basenames are independent.
 *
 * @param db - Open database.
 * @param applied - Recorded migration identities.
 * @param file - SQL basename.
 * @param key - Current namespaced identity.
 * @param namespace - Current logical directory.
 * @param options - Legacy directory evidence.
 */
function adoptLegacyKey(
  db: Database.Database,
  applied: Map<string, string | null>,
  file: string,
  key: string,
  namespace: string,
  options: MigrationOptions,
): void {
  if (!applied.has(file) || applied.get(file) != null) return
  // Existing single-directory callers retain their historical skip behavior.
  // Do not invent ownership: a later namespaced caller may need to resolve it.
  if (key === file && options.legacyDirectories === undefined) return
  if (
    options.legacyDirectories === undefined ||
    options.legacyDirectories.some((directory) => existsSync(join(directory, file)))
  ) {
    throw new Error(
      `Ambiguous legacy migration ${file}: the ledger has no source directory. ` +
        'Confirm which SQL file was applied, then assign that row its matching file identity ' +
        'and namespace before retrying. No SQL from this file was run.',
    )
  }
  // Preserve the original application timestamp and never replay a backfill.
  db.prepare(`UPDATE "${MIGRATION_LEDGER}" SET "file" = ?, "namespace" = ? WHERE "file" = ?`).run(
    key,
    namespace,
    file,
  )
  applied.delete(file)
  applied.set(key, namespace)
}

/**
 * Returns a `runMigrations()` bound to a migrations directory.
 *
 * @param migrationsDir - Absolute path to the directory of ordered `*.sql`
 *   migration files, resolved from the API package directory.
 * @param options - A stable namespace for a second SQL directory and evidence
 *   for adopting legacy bare filenames without replaying their SQL.
 * @returns A no-arg `runMigrations()` that opens the SQLite file (creating it
 *   and its parent directory if missing) and applies every migration file in
 *   lexical order using multi-statement `exec()`. Reads the file path from the
 *   `SQLITE_PATH` env var (default `./data/app.db`), matching the pool.
 */
export function createMigrator(
  migrationsDir: string,
  options: MigrationOptions = {},
): () => Promise<void> {
  const namespace = options.namespace ?? ''
  return async function runMigrations(): Promise<void> {
    const dbPath = process.env.SQLITE_PATH ?? './data/app.db'

    // SQLite auto-creates the file on open — just ensure the parent dir exists.
    const dir = dirname(dbPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const db = new Database(dbPath)
    try {
      const sqlFiles = existsSync(migrationsDir)
        ? readdirSync(migrationsDir)
            .filter((file) => file.endsWith('.sql'))
            .sort()
        : []

      if (sqlFiles.length === 0) {
        console.log('No migration files found.')
        return
      }

      const failures: { file: string; message: string }[] = []
      const { applied, adopting } = openLedger(db)
      // Read once: column reconciliation is limited to the file that CREATES a table,
      // so every file's declarations are needed before the first one is applied.
      const sources = new Map(
        sqlFiles.map((file) => [file, readFileSync(join(migrationsDir, file), 'utf-8')]),
      )
      const owners = tableOwners(sqlFiles, sources)
      let skipped = 0

      for (const file of sqlFiles) {
        const key = namespace ? `${namespace}/${file}` : file
        if (!applied.has(key) || key === file) {
          adoptLegacyKey(db, applied, file, key, namespace, options)
        }
        // Resource/template setup migrations are authored in Postgres dialect;
        // translate the few Postgres-only syntax constructs (gen_random_uuid(),
        // now(), ::casts, index USING <method>) so they apply on SQLite. No-op on
        // already-SQLite DDL. Without this, those migrations abort with
        // `near "(": syntax error` and the app never boots.
        // `ADD COLUMN IF NOT EXISTS` and `DROP COLUMN IF EXISTS` are honored (the
        // statement is dropped when the database already satisfies it) rather than
        // merely translated: see dropSatisfiedAddColumns / dropSatisfiedDropColumns.
        const sql = translateDdlToSqlite(
          dropSatisfiedAddColumns(db, dropSatisfiedDropColumns(db, sources.get(file) ?? '')),
        )
        if (applied.has(key)) {
          // A recorded file never runs again (a DROP or a backfill in it would repeat
          // on every boot); columns its own CREATE TABLE declares are still added.
          skipped++
          addMissingColumns(db, sql, file, owners)
          continue
        }
        // In a transaction, so a file that fails applies none of its statements: a
        // half-applied file made its fixed version fail on its own first statement
        // (X1 flash-m40). A file that manages its own transaction runs as written.
        const wrap = !db.inTransaction && !/^\s*(?:BEGIN|COMMIT|END|ROLLBACK)\b/im.test(sql)
        try {
          if (wrap) db.exec('BEGIN')
          // exec() (not prepare/run) so a file with multiple statements applies.
          db.exec(sql)
          record(db, key, namespace)
          if (wrap) db.exec('COMMIT')
          console.log(`✓ ${file}`)
          addMissingColumns(db, sql, file, owners)
        } catch (err) {
          if (wrap && db.inTransaction) db.exec('ROLLBACK')
          const msg = err instanceof Error ? err.message : String(err)
          if (isIdempotencyError(err)) {
            if (adopting) {
              // Ran on an earlier boot, before this database kept a record.
              record(db, key, namespace)
              console.warn(`⚠ ${file}: ${msg} (applied before; now recorded)`)
            } else {
              // The file rolled back (flash-m39 froze a backfill behind an ADD COLUMN
              // this way). Not recorded, so it is retried, and the log says so.
              console.warn(
                `⚠ ${file}: ${msg} — nothing in this file was applied; an object it creates ` +
                  'already exists, so remove that statement or move the rest to a new migration file',
              )
            }
            addMissingColumns(db, sql, file, owners)
          } else {
            // A genuinely broken migration must NOT be swallowed as if it were
            // idempotent — that boots the app with a missing/partial schema and
            // the failure resurfaces later, far from the real cause. Collect it
            // and keep going so ONE boot log reports every broken file at once.
            console.error(`✗ ${file}: ${msg}`)
            failures.push({ file, message: msg })
          }
        }
      }

      if (failures.length > 0) {
        throw new Error(
          `Migrations failed — ${failures.length} file(s) had non-idempotency errors; ` +
            `the app would boot with a missing/partial schema:\n` +
            failures.map((f) => `  - ${f.file}: ${f.message}`).join('\n'),
        )
      }

      if (skipped > 0) console.log(`· ${skipped} migration file(s) already applied`)
      console.log('Migrations complete.')
    } finally {
      db.close()
    }
  }
}
