/**
 * DuckDB migration runner.
 *
 * Same contract as the sqlite/pglite bonds' migrators: every `*.sql` file in a
 * directory runs in lexical order; "already exists" errors from a re-run are
 * warnings; any other error fails the run with every broken file named. There
 * is no `CREATE DATABASE` step — DuckDB creates the file when it opens. Each
 * file runs ONCE, inside one transaction, recorded in the
 * `_molecule_migrations` ledger.
 *
 * DuckDB natively supports `ADD COLUMN IF NOT EXISTS`, `DROP COLUMN IF
 * EXISTS`, `gen_random_uuid()`, `now()` and `CREATE TABLE IF NOT EXISTS`, so
 * the sqlite bond's column-reconciliation machinery is not needed here. What the
 * translation does — and refuses — is documented on `translateDdlToDuckdb`:
 * `jsonb`, index `USING <method>` and partial indexes are translated without
 * changing behaviour, while an `ON DELETE`/`ON UPDATE` referential action throws
 * `UnsupportedSqlFeatureError` (DuckDB cannot reproduce it).
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when migrator.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type { DatabasePool, DatabaseTransaction } from '@molecule/api-database'

import { createPool } from './pool.js'
import { translateDdlToDuckdb } from './utilities.js'

/** The table that records which migration files have run. */
export const MIGRATION_LEDGER = '_molecule_migrations'

/**
 * A pool that can run migrations — `DatabasePool` plus the interactive
 * transaction every bond in the `database` category implements (the interface
 * marks it optional; no bond ships without it, and the runner needs it).
 */
export type MigratablePool = DatabasePool & {
  /** Begins a transaction that holds the pool's connection until it ends. */
  transaction(): Promise<DatabaseTransaction>
}

/**
 * Returns true when `err` looks like an "already exists" / duplicate-object
 * idempotency error — the class of error an `IF NOT EXISTS` migration is
 * EXPECTED to hit on a re-run. DuckDB errors carry no code, so this matches
 * the message text (the same approach the sqlite bond takes).
 *
 * @param err - The error thrown while applying a migration.
 * @returns True if it is safe to warn and continue.
 */
export function isIdempotencyError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    /already exists/i.test(msg) ||
    /duplicate (column|key|object) name/i.test(msg) ||
    /multiple primary keys for table/i.test(msg)
  )
}

/** Options for the migration runner. */
export interface MigrationOptions {
  /** Prefix for ledger keys when one database applies SQL from more than one directory. */
  namespace?: string
}

/**
 * Apply every migration file in `migrationsDir` to `pool`, in lexical order.
 * Exported so a sibling bond (motherduck) can run the same ledger logic on
 * its own pool.
 *
 * @param pool - The pool to migrate (its database is created on first open).
 * @param migrationsDir - Absolute path to the directory of ordered `*.sql` files.
 * @param options - Ledger namespace for multi-directory apps.
 * @returns Resolves when every file is applied or recorded.
 * @throws {Error} When any file fails with a non-idempotency error — every
 *   broken file is named in the one error, so a single boot log reports all.
 */
export async function applyMigrations(
  pool: MigratablePool,
  migrationsDir: string,
  options: MigrationOptions = {},
): Promise<void> {
  const namespace = options.namespace ?? ''
  const sqlFiles = existsSync(migrationsDir)
    ? readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort()
    : []

  if (sqlFiles.length === 0) {
    console.log('No migration files found.')
    return
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS "${MIGRATION_LEDGER}" ("file" VARCHAR PRIMARY KEY, "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "namespace" VARCHAR)`,
  )
  const applied = new Set(
    (await pool.query<{ file: string }>(`SELECT "file" FROM "${MIGRATION_LEDGER}"`)).rows.map(
      (row) => String(row.file),
    ),
  )

  const failures: { file: string; message: string }[] = []
  let skipped = 0

  for (const file of sqlFiles) {
    const key = namespace ? `${namespace}/${file}` : file
    // Resource/template setup migrations are authored in Postgres dialect.
    // translateDdlToDuckdb rewrites jsonb, index USING and partial indexes, and
    // throws for a referential action DuckDB cannot reproduce (naming this file
    // via options.source, so one boot log points at the resource). No-op on
    // already-DuckDB DDL.
    const sql = translateDdlToDuckdb(readFileSync(join(migrationsDir, file), 'utf-8'), {
      source: file,
    })
    if (applied.has(key)) {
      // A recorded file never runs again (a DROP or a backfill in it would
      // repeat on every boot).
      skipped++
      continue
    }
    // In a transaction, so a file that fails applies none of its statements.
    // `pool.transaction()` issues the BEGIN; COMMIT/ROLLBACK come from the
    // transaction object. A file that manages its own BEGIN/COMMIT runs
    // OUTSIDE ours — DuckDB refuses to nest transactions ("cannot start a
    // transaction within a transaction"), the same case the sqlite migrator
    // detects.
    const selfManaged = /^\s*(?:BEGIN|START\s+TRANSACTION)\b/im.test(sql)
    try {
      if (selfManaged) {
        await pool.query(sql)
        await pool.query(`INSERT INTO "${MIGRATION_LEDGER}" ("file", "namespace") VALUES (?, ?)`, [
          key,
          namespace,
        ])
      } else {
        const tx = await pool.transaction()
        try {
          // No values: the client runs a multi-statement string in full.
          await tx.query(sql)
          await tx.query(`INSERT INTO "${MIGRATION_LEDGER}" ("file", "namespace") VALUES (?, ?)`, [
            key,
            namespace,
          ])
          await tx.commit()
        } catch (err) {
          await tx.rollback().catch((_error) => {
            // The transaction already aborted in the engine; the rollback is
            // bookkeeping. The original error is the one to report.
          })
          throw err
        }
      }
      console.log(`✓ ${file}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (isIdempotencyError(err)) {
        console.warn(
          `⚠ ${file}: ${msg} — nothing in this file was applied; an object it creates ` +
            'already exists, so remove that statement or move the rest to a new migration file',
        )
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
}

/**
 * Returns a `runMigrations()` bound to a migrations directory.
 *
 * @param migrationsDir - Absolute path to the directory of ordered `*.sql`
 *   migration files, resolved from the API package directory.
 * @param options - A stable namespace for a second SQL directory.
 * @returns A no-arg `runMigrations()` that opens the DuckDB file (creating it
 *   and its parent directory if missing) and applies every migration file in
 *   lexical order. Reads the file path from the `DUCKDB_PATH` env var
 *   (default `./data/app.duckdb`), matching the pool.
 */
export function createMigrator(
  migrationsDir: string,
  options: MigrationOptions = {},
): () => Promise<void> {
  return async function runMigrations(): Promise<void> {
    const pool = createPool() as MigratablePool
    try {
      await applyMigrations(pool, migrationsDir, options)
    } finally {
      await pool.end()
    }
  }
}
