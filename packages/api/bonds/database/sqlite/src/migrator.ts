/**
 * SQLite migration runner.
 *
 * Mirrors the Postgres bond's `createMigrator`, but SQLite has no server-side
 * database to provision — the file is created on first open — so there is NO
 * `CREATE DATABASE` bootstrap step. Migration files are applied with
 * better-sqlite3's `db.exec()`, which runs a file containing MULTIPLE statements
 * (a prepared statement / the pool's `query()` runs only one), so a normal
 * multi-statement `*.sql` migration applies correctly.
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
    const body = sql.slice(start, i - 1)
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

/**
 * Add the columns a `CREATE TABLE IF NOT EXISTS` declares that the existing table
 * lacks. Every migration file runs on every boot, and on a table that already exists
 * `IF NOT EXISTS` is a silent no-op: a column added to the file later never reached
 * the database, nothing said so, and the app failed on it (X1 runs flash-m19, m20
 * hand-altered the live database). Additive only; a column SQLite cannot add in
 * place (PRIMARY KEY, UNIQUE, NOT NULL without a default) is reported, not forced.
 *
 * @param db - The open database.
 * @param sql - The migration file just applied.
 * @param file - Its name, for the log.
 */
function addMissingColumns(db: Database.Database, sql: string, file: string): void {
  for (const { table, columns } of declaredTables(sql)) {
    const existing = db.prepare('SELECT name FROM pragma_table_info(?)').all(table) as {
      name: string
    }[]
    if (existing.length === 0) continue
    const have = new Set(existing.map((c) => c.name.toLowerCase()))
    for (const column of columns) {
      if (have.has(column.name.toLowerCase())) continue
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

      for (const file of sqlFiles) {
        // Resource/template setup migrations are authored in Postgres dialect;
        // translate the few Postgres-only syntax constructs (gen_random_uuid(),
        // now(), ::casts, index USING <method>) so they apply on SQLite. No-op on
        // already-SQLite DDL. Without this, those migrations abort with
        // `near "(": syntax error` and the app never boots.
        const sql = translateDdlToSqlite(readFileSync(join(migrationsDir, file), 'utf-8'))
        try {
          // exec() (not prepare/run) so a file with multiple statements applies.
          db.exec(sql)
          console.log(`✓ ${file}`)
          addMissingColumns(db, sql, file)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (isIdempotencyError(err)) {
            // IF NOT EXISTS re-runs are expected to hit this — warn, don't fail.
            console.warn(`⚠ ${file}: ${msg}`)
            addMissingColumns(db, sql, file)
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

      console.log('Migrations complete.')
    } finally {
      db.close()
    }
  }
}
