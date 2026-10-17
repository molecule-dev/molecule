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
 * nothing said so, and the app failed on it (X1 runs flash-m19, m20 hand-altered the
 * live database). A table another file creates is NOT reconciled: that made a
 * rewritten, since-deleted old migration add `userId NOT NULL` to a package's table
 * (X1 m103), and every insert the package's own service made failed. Additive only;
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
    const owner = owners.get(table.toLowerCase())
    if (owner !== undefined && owner !== file) {
      console.warn(
        `⚠ ${file}: CREATE TABLE IF NOT EXISTS "${table}" is a no-op — ${owner} creates it; ` +
          'add columns with ALTER TABLE … ADD COLUMN in a new migration',
      )
      continue
    }
    const existing = db.prepare('SELECT name FROM pragma_table_info(?)').all(table) as {
      name: string
    }[]
    if (existing.length === 0) continue
    const have = new Set(existing.map((c) => c.name.toLowerCase()))
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
 * @returns The applied file names and whether this boot adopts an existing database.
 */
function openLedger(db: Database.Database): { applied: Set<string>; adopting: boolean } {
  const had = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(MIGRATION_LEDGER)
  const others = db
    .prepare(
      "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    )
    .get() as { n: number } | undefined
  db.exec(
    `CREATE TABLE IF NOT EXISTS "${MIGRATION_LEDGER}" ("file" TEXT PRIMARY KEY, "applied_at" TEXT NOT NULL)`,
  )
  const rows = db.prepare(`SELECT "file" FROM "${MIGRATION_LEDGER}"`).all() as { file: string }[]
  return { applied: new Set(rows.map((r) => r.file)), adopting: !had && (others?.n ?? 0) > 0 }
}

/**
 * Records a file as applied.
 *
 * @param db - The open database.
 * @param file - The migration file name.
 */
function record(db: Database.Database, file: string): void {
  db.prepare(
    `INSERT OR IGNORE INTO "${MIGRATION_LEDGER}" ("file", "applied_at") VALUES (?, ?)`,
  ).run(file, new Date().toISOString())
}

/**
 * Returns a `runMigrations()` bound to a migrations directory.
 *
 * @param migrationsDir - Absolute path to the directory of ordered `*.sql`
 *   migration files. Resolve via
 *   `join(new URL('.', import.meta.url).pathname, '../../migrations')` from the
 *   app's `scripts/migrate.ts`.
 * @returns A no-arg `runMigrations()` that opens the SQLite file (creating it
 *   and its parent directory if missing) and applies every migration file in
 *   lexical order using multi-statement `exec()`. Reads the file path from the
 *   `SQLITE_PATH` env var (default `./data/app.db`), matching the pool.
 */
export function createMigrator(migrationsDir: string): () => Promise<void> {
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
        // Resource/template setup migrations are authored in Postgres dialect;
        // translate the few Postgres-only syntax constructs (gen_random_uuid(),
        // now(), ::casts, index USING <method>) so they apply on SQLite. No-op on
        // already-SQLite DDL. Without this, those migrations abort with
        // `near "(": syntax error` and the app never boots.
        // `ADD COLUMN IF NOT EXISTS` is honored (the statement is dropped when the
        // column is already there) rather than merely translated: see
        // dropSatisfiedAddColumns.
        const sql = translateDdlToSqlite(dropSatisfiedAddColumns(db, sources.get(file) ?? ''))
        if (applied.has(file)) {
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
          record(db, file)
          if (wrap) db.exec('COMMIT')
          console.log(`✓ ${file}`)
          addMissingColumns(db, sql, file, owners)
        } catch (err) {
          if (wrap && db.inTransaction) db.exec('ROLLBACK')
          const msg = err instanceof Error ? err.message : String(err)
          if (isIdempotencyError(err)) {
            if (adopting) {
              // Ran on an earlier boot, before this database kept a record.
              record(db, file)
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
