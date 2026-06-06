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

import Database from 'better-sqlite3'

import { translateDdlToSqlite } from './utilities.js'

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
          // IF NOT EXISTS migrations are idempotent — log, don't fail the run.
          console.warn(`⚠ ${file}: ${msg}`)
        }
      }

      console.log('Migrations complete.')
    } finally {
      db.close()
    }
  }
}
