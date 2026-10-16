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
  // invalid_table_definition — raised as "multiple primary keys for table X are
  // not allowed" when `ALTER TABLE ... ADD CONSTRAINT ... PRIMARY KEY` re-runs
  // against a table that already has its primary key. Postgres checks "does this
  // table already have a PK" BEFORE it checks the constraint name, so a re-run
  // raises this and NOT 42710/"already exists" — verified against pg directly.
  // That makes it an idempotency signal in every case that reaches here: the
  // statement's desired end state (this table has a primary key) already holds.
  //
  // It matters because `CREATE TABLE IF NOT EXISTS` + a separate unguarded
  // `ADD CONSTRAINT ... PRIMARY KEY` is precisely the shape `pg_dump` emits, so
  // it is what users paste into their own migrations — and every fleet template
  // is built that way. Without this the app boots once, then REFUSES to boot
  // ever again against a persistent database (fail-closed on a partial schema),
  // which is exactly how inventory-management lost 92 of 113 tests to a dead API.
  '42P16',
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
  return (
    /already exists/i.test(msg) ||
    /duplicate (column|key|object) name/i.test(msg) ||
    /multiple primary keys for table/i.test(msg)
  )
}

/** The table that records which migration files have run. */
export const MIGRATION_LEDGER = '_molecule_migrations'

/** A query function, as the migrator's connection exposes it. */
type Query = (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>

/**
 * Opens the ledger: the files already applied, and whether the table is new on a
 * database that already holds tables (one migrated before this runner kept a
 * record, so its files ran under the old every-boot rule).
 *
 * @param query - Runs one statement.
 * @returns The applied file names and whether this boot adopts an existing database.
 */
async function openLedger(query: Query): Promise<{ applied: Set<string>; adopting: boolean }> {
  const had = (await query('SELECT to_regclass($1) AS t', [`"${MIGRATION_LEDGER}"`])).rows[0]?.t
  const others = (
    await query(
      "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'",
    )
  ).rows[0]?.n
  await query(
    `CREATE TABLE IF NOT EXISTS "${MIGRATION_LEDGER}" ("file" TEXT PRIMARY KEY, "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now())`,
  )
  const rows = (await query(`SELECT "file" FROM "${MIGRATION_LEDGER}"`)).rows
  return {
    applied: new Set(rows.map((r) => String(r.file))),
    adopting: had == null && Number(others ?? 0) > 0,
  }
}

/**
 * Records a file as applied.
 *
 * @param query - Runs one statement.
 * @param file - The migration file name.
 */
async function record(query: Query, file: string): Promise<void> {
  await query(`INSERT INTO "${MIGRATION_LEDGER}" ("file") VALUES ($1) ON CONFLICT DO NOTHING`, [
    file,
  ])
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
      // Never the URL itself: it carries the database password (and this output lands in CI and
      // deploy logs). Host and database name are enough to find the setting.
      let target = 'DATABASE_URL'
      try {
        const u = new URL(databaseUrl)
        target = `DATABASE_URL (${u.host}${u.pathname})`
      } catch (_error) {
        // not a parseable URL: keep the generic name
      }
      console.error(`  Check ${target} in .env`)
      throw err
    }

    const sqlFiles = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    const failures: { file: string; message: string }[] = []

    if (sqlFiles.length === 0) {
      console.log('No migration files found.')
    } else {
      const query: Query = (text, params) =>
        client.query(text, params as unknown[]) as unknown as Promise<{
          rows: Record<string, unknown>[]
        }>
      const { applied, adopting } = await openLedger(query)
      let skipped = 0
      for (const file of sqlFiles) {
        // A recorded file never runs again: a DROP or a backfill in it would repeat on
        // every boot (X1 flash-m39).
        if (applied.has(file)) {
          skipped++
          continue
        }
        const sql = readFileSync(join(migrationsDir, file), 'utf-8')
        try {
          // A multi-statement query runs as one implicit transaction: all or nothing.
          await client.query(sql)
          await record(query, file)
          console.log(`✓ ${file}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (isIdempotencyError(err)) {
            if (adopting) {
              // Ran on an earlier boot, before this database kept a record.
              await record(query, file)
              console.warn(`⚠ ${file}: ${msg} (applied before; now recorded)`)
            } else {
              // The whole file rolled back with the failing statement. Not recorded,
              // so it is retried, and the log says what did not happen.
              console.warn(
                `⚠ ${file}: ${msg} — nothing in this file was applied; an object it creates ` +
                  'already exists, so remove that statement or move the rest to a new migration file',
              )
            }
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
      if (skipped > 0) console.log(`· ${skipped} migration file(s) already applied`)
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
