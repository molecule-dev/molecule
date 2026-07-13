/**
 * Postgres migration runner factory.
 *
 * `createMigrator(migrationsDir)` returns a no-arg `runMigrations()`
 * function bound to the given migrations directory: it connects to
 * Postgres, creates the target database if it does not yet exist, then
 * runs every `*.sql` file in `migrationsDir` in lexical order.
 *
 * This is Postgres-specific bootstrapping plumbing (`CREATE DATABASE`,
 * the `pg_database` catalog probe, raw `pg.Client` connections), so it
 * lives in the PostgreSQL bond rather than in any framework/bond-setup
 * package — those must never import the concrete `pg` driver.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when migrator.js is imported directly
// (not through the package barrel).
import './secrets.js'
import pg from 'pg'

import { deriveSsl } from './ssl.js'

const DEFAULT_DB_NAME = 'myapp'

/**
 * Extract the target database name from a Postgres connection URL,
 * falling back to `'myapp'` when the URL has no path or cannot be parsed.
 *
 * @param databaseUrl - The Postgres connection URL.
 * @returns The database name.
 */
function deriveDbName(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).pathname.replace(/^\//, '') || DEFAULT_DB_NAME
  } catch (_error) {
    // URL parsing failed (e.g. plain host string without a scheme); fall back to default.
    return DEFAULT_DB_NAME
  }
}

/** Postgres SQLSTATE codes for "already exists" / duplicate-object DDL errors. */
const IDEMPOTENT_PG_CODES = new Set([
  '42P07', // duplicate_table
  '42701', // duplicate_column
  '42710', // duplicate_object
  '42P06', // duplicate_schema
  '42P04', // duplicate_database
  '42723', // duplicate_function
])

/**
 * Returns true when `err` looks like an "already exists" / duplicate-object
 * idempotency error — the class of error an `IF NOT EXISTS` migration is
 * EXPECTED to hit on a re-run (e.g. a fresh boot re-applying every migration
 * file against an already-provisioned database). Matched by SQLSTATE code
 * first, falling back to the message text so hand-written migrations that
 * don't trip a recognized code (or wrap the pg error) are still covered.
 *
 * @param err - The error thrown by `client.query(sql)`.
 * @returns True if the error is safe to warn-and-continue past.
 */
function isIdempotencyError(err: unknown): boolean {
  const code = (err as { code?: string } | undefined)?.code
  if (code && IDEMPOTENT_PG_CODES.has(code)) return true
  const msg = err instanceof Error ? err.message : String(err)
  return /already exists/i.test(msg) || /duplicate (column|key|object) name/i.test(msg)
}

/**
 * Returns a `runMigrations()` function bound to the given directory.
 *
 * @param migrationsDir - Absolute path to the directory containing
 *   ordered `*.sql` migration files. Resolve via
 *   `join(new URL('.', import.meta.url).pathname, '../../migrations')`
 *   from the app's `scripts/migrate.ts`.
 * @returns A no-arg `runMigrations()` that creates the database (if
 *   missing) and applies every migration file in lexical order.
 */
export function createMigrator(migrationsDir: string): () => Promise<void> {
  return async function runMigrations(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL || 'postgres://localhost:5432/myapp'
    const sslConfig = deriveSsl(databaseUrl)
    const dbName = deriveDbName(databaseUrl)

    // Step 1: Try to create the database (connects to 'postgres' db as admin).
    try {
      const adminUrl = new URL(databaseUrl)
      adminUrl.pathname = '/postgres'
      const adminClient = new pg.Client({
        connectionString: adminUrl.toString(),
        ssl: sslConfig,
      })
      await adminClient.connect()

      const { rows } = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [
        dbName,
      ])
      if (rows.length === 0) {
        await adminClient.query(`CREATE DATABASE "${dbName}"`)
        console.log(`✓ Created database '${dbName}'`)
      } else {
        console.log(`✓ Database '${dbName}' already exists`)
      }

      await adminClient.end()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`⚠ Could not auto-create database: ${msg}`)
      console.warn(`  If '${dbName}' doesn't exist, run: createdb ${dbName}`)
    }

    // Step 2: Run migrations.
    const client = new pg.Client({
      connectionString: databaseUrl,
      ssl: sslConfig,
    })

    try {
      await client.connect()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`✗ Could not connect to database: ${msg}`)
      console.error(`  Check DATABASE_URL in .env: ${databaseUrl}`)
      throw err
    }

    const sqlFiles = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    const failures: { file: string; message: string }[] = []

    if (sqlFiles.length === 0) {
      console.log('No migration files found.')
    } else {
      for (const file of sqlFiles) {
        const sql = readFileSync(join(migrationsDir, file), 'utf-8')
        try {
          await client.query(sql)
          console.log(`✓ ${file}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (isIdempotencyError(err)) {
            // IF NOT EXISTS re-runs are expected to hit this — warn, don't fail.
            console.warn(`⚠ ${file}: ${msg}`)
          } else {
            // A genuinely broken migration (syntax error, bad column, failed ALTER)
            // must NOT be swallowed as if it were idempotent — that boots the app
            // with a missing/partial schema and the failure resurfaces later as an
            // unrelated "relation does not exist" far from the real cause. Collect
            // it and keep going so ONE boot log reports every broken file at once.
            console.error(`✗ ${file}: ${msg}`)
            failures.push({ file, message: msg })
          }
        }
      }
    }

    await client.end()

    if (failures.length > 0) {
      throw new Error(
        `Migrations failed — ${failures.length} file(s) had non-idempotency errors; ` +
          `the app would boot with a missing/partial schema:\n` +
          failures.map((f) => `  - ${f.file}: ${f.message}`).join('\n'),
      )
    }

    console.log('Migrations complete.')
  }
}
