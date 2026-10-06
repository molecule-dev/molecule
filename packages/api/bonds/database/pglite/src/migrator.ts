/**
 * PGlite migration runner.
 *
 * Same contract as the postgresql bond's `createMigrator`: every `*.sql` file
 * in a directory runs in lexical order; "already exists" errors from a re-run
 * are warnings; any other error fails the run with every broken file named.
 * There is no `CREATE DATABASE` step — PGlite creates its database when it
 * opens. Migrations run on the SAME pool the app queries (an in-memory
 * database exists only inside its own instance), so the default
 * `runMigrations()` targets the package's default pool.
 *
 * @module
 */

import { getPoolInstance } from './defaults.js'
import type { PglitePool } from './types.js'

/** One migration: a name (for ordering and logs) and its SQL. */
export interface PgliteMigration {
  /** File name, e.g. `0001_init.sql`. Migrations run sorted by name. */
  name: string
  /** One or more SQL statements. */
  sql: string
}

/** Postgres SQLSTATE codes for "already exists" / duplicate-object DDL errors. */
const IDEMPOTENT_PG_CODES = new Set([
  '42P07', // duplicate_table
  '42701', // duplicate_column
  '42710', // duplicate_object
  '42P06', // duplicate_schema
  '42P04', // duplicate_database
  '42723', // duplicate_function
  // invalid_table_definition: "multiple primary keys for table X are not
  // allowed" when an unguarded ADD CONSTRAINT … PRIMARY KEY re-runs — the
  // statement's end state already holds (same reasoning as the postgresql bond).
  '42P16',
])

/**
 * Whether an error is the "already exists" kind an `IF NOT EXISTS` migration
 * is expected to hit on a re-run. Matches the SQLSTATE code first, then the
 * message text.
 *
 * @param err - The error thrown while applying a migration.
 * @returns `true` if it is safe to warn and continue.
 */
export function isIdempotencyError(err: unknown): boolean {
  const code = (err as { code?: string } | undefined)?.code
  if (code && IDEMPOTENT_PG_CODES.has(code)) return true
  const msg = err instanceof Error ? err.message : String(err)
  return (
    /already exists/i.test(msg) ||
    /duplicate (column|key|object) name/i.test(msg) ||
    /multiple primary keys for table/i.test(msg)
  )
}

/**
 * Applies migrations to a pool, in name order. Works in any runtime (the SQL is
 * passed in, nothing is read from disk) — use this in a browser, with the SQL
 * bundled by your build tool.
 *
 * @param pool - The PGlite pool to migrate.
 * @param migrations - The migrations to apply.
 * @returns Resolves when every migration has been applied.
 * @throws {Error} Naming every migration that failed with a non-idempotency error.
 */
export async function applyMigrations(
  pool: PglitePool,
  migrations: PgliteMigration[],
): Promise<void> {
  const sorted = [...migrations].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  if (sorted.length === 0) {
    console.log('No migration files found.')
    return
  }
  const failures: { file: string; message: string }[] = []
  for (const migration of sorted) {
    try {
      // exec() runs a file holding several statements.
      await pool.exec(migration.sql)
      console.log(`✓ ${migration.name}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (isIdempotencyError(err)) {
        console.warn(`⚠ ${migration.name}: ${msg}`)
      } else {
        // A broken migration must fail the boot, not leave a partial schema
        // that surfaces later as "relation does not exist". Keep going so one
        // run reports every broken file.
        console.error(`✗ ${migration.name}: ${msg}`)
        failures.push({ file: migration.name, message: msg })
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
}

/**
 * Returns a `runMigrations()` bound to a migrations directory (Node only).
 *
 * @param migrationsDir - Absolute path to the directory of ordered `*.sql`
 *   files, e.g. `join(new URL('.', import.meta.url).pathname, '../../migrations')`
 *   from the app's `scripts/migrate.ts`.
 * @param pool - The pool to migrate. Defaults to the package's default pool
 *   (the one `pool`/`store` use), so migrations land in the database the app
 *   reads.
 * @returns A no-arg `runMigrations()` that applies every `*.sql` file in
 *   lexical order. A missing directory counts as "no migrations".
 */
export function createMigrator(migrationsDir: string, pool?: PglitePool): () => Promise<void> {
  return async function runMigrations(): Promise<void> {
    const { existsSync, readdirSync, readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const files = existsSync(migrationsDir)
      ? readdirSync(migrationsDir).filter((file) => file.endsWith('.sql'))
      : []
    const migrations = files.map((name) => ({
      name,
      sql: readFileSync(join(migrationsDir, name), 'utf-8'),
    }))
    await applyMigrations(pool ?? getPoolInstance(), migrations)
  }
}
