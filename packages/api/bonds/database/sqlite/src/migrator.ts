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
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (isIdempotencyError(err)) {
            // IF NOT EXISTS re-runs are expected to hit this — warn, don't fail.
            console.warn(`⚠ ${file}: ${msg}`)
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
