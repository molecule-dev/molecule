/**
 * MySQL migration runner.
 *
 * Mirrors the Postgres bond's `createMigrator`: MySQL has a server-side database
 * (schema) to provision, so it connects to the server (no schema selected),
 * runs `CREATE DATABASE IF NOT EXISTS`, then applies each `*.sql` file. The
 * migration connection is opened with `multipleStatements: true` so a normal
 * multi-statement `*.sql` file applies in one `query()` (the pool's `query()`
 * disables multi-statements for safety).
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when migrator.js is imported directly
// (not through the package barrel).
import './secrets.js'
import mysql from 'mysql2/promise'

import { translateDdlToMysql } from './utilities.js'

interface MysqlMigrateConfig {
  host: string
  port: number
  user: string
  password?: string
  database?: string
}

/** mysql2 error codes for "already exists" / duplicate-object DDL errors. */
const IDEMPOTENT_MYSQL_CODES = new Set([
  'ER_TABLE_EXISTS_ERROR',
  'ER_DUP_FIELDNAME',
  'ER_DUP_KEYNAME',
  'ER_DB_CREATE_EXISTS',
])

/**
 * Returns true when `err` looks like an "already exists" / duplicate-object
 * idempotency error — the class of error an `IF NOT EXISTS` migration is
 * EXPECTED to hit on a re-run. Matched by mysql2's `.code` first, falling
 * back to the message text (mirrors the postgresql bond's migrator).
 *
 * @param err - The error thrown by `connection.query(sql)`.
 * @returns True if the error is safe to warn-and-continue past.
 */
function isIdempotencyError(err: unknown): boolean {
  const code = (err as { code?: string } | undefined)?.code
  if (code && IDEMPOTENT_MYSQL_CODES.has(code)) return true
  const msg = err instanceof Error ? err.message : String(err)
  return /already exists/i.test(msg) || /duplicate (column|key) name/i.test(msg)
}

/**
 * Derives connection settings from `MYSQL_URL` or the discrete `MYSQL_*` env
 * vars, matching `createPool` in provider.ts.
 *
 * @returns The resolved host/port/user/password/database for migration.
 */
function deriveConfig(): MysqlMigrateConfig {
  const url = process.env.MYSQL_URL
  if (url) {
    const parsed = new URL(url)
    return {
      host: parsed.hostname || 'localhost',
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username) || 'root',
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      database: parsed.pathname.replace(/^\//, '') || undefined,
    }
  }
  return {
    host: process.env.MYSQL_HOST ?? 'localhost',
    port: parseInt(process.env.MYSQL_PORT ?? '3306', 10),
    user: process.env.MYSQL_USER ?? 'root',
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  }
}

/** The table that records which migration files have run. */
export const MIGRATION_LEDGER = '_molecule_migrations'

/**
 * Opens the ledger: the files already applied, and whether the table is new on a
 * database that already holds tables (one migrated before this runner kept a
 * record, so its files ran under the old every-boot rule).
 *
 * @param connection - The migration connection (ANSI_QUOTES on).
 * @returns The applied file names and whether this boot adopts an existing database.
 */
async function openLedger(
  connection: mysql.Connection,
): Promise<{ applied: Set<string>; adopting: boolean }> {
  const count = async (sql: string, params: unknown[] = []): Promise<number> => {
    const [rows] = (await connection.query(sql, params)) as unknown as [{ n?: unknown }[]]
    return Number(rows?.[0]?.n ?? 0)
  }
  const tables =
    'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE()'
  const had = await count(`${tables} AND table_name = ?`, [MIGRATION_LEDGER])
  const others = await count(tables)
  await connection.query(
    `CREATE TABLE IF NOT EXISTS "${MIGRATION_LEDGER}" ("file" VARCHAR(255) PRIMARY KEY, "applied_at" VARCHAR(40) NOT NULL)`,
  )
  const [rows] = (await connection.query(
    `SELECT "file" FROM "${MIGRATION_LEDGER}"`,
  )) as unknown as [{ file?: unknown }[]]
  return {
    applied: new Set((rows ?? []).map((r) => String(r.file))),
    adopting: had === 0 && others > 0,
  }
}

/**
 * Records a file as applied.
 *
 * @param connection - The migration connection.
 * @param file - The migration file name.
 */
async function record(connection: mysql.Connection, file: string): Promise<void> {
  await connection.query(
    `INSERT IGNORE INTO "${MIGRATION_LEDGER}" ("file", "applied_at") VALUES (?, ?)`,
    [file, new Date().toISOString()],
  )
}

/**
 * Returns a `runMigrations()` bound to a migrations directory.
 *
 * @param migrationsDir - Absolute path to the directory of ordered `*.sql`
 *   migration files. Resolve via
 *   `join(new URL('.', import.meta.url).pathname, '../../migrations')` from the
 *   app's `scripts/migrate.ts`.
 * @returns A no-arg `runMigrations()` that creates the database (if missing) and
 *   applies every migration file in lexical order using a multi-statement
 *   connection.
 */
export function createMigrator(migrationsDir: string): () => Promise<void> {
  return async function runMigrations(): Promise<void> {
    const config = deriveConfig()

    // Step 1: create the database if missing (connect to the server, no schema).
    if (config.database) {
      try {
        const admin = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
        })
        // Identifier quoting is backticks; the name comes from trusted app config.
        await admin.query('CREATE DATABASE IF NOT EXISTS `' + config.database + '`')
        await admin.end()
        console.log(`✓ Database '${config.database}' ready`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`⚠ Could not auto-create database: ${msg}`)
      }
    }

    // Step 2: run migrations. multipleStatements so a multi-statement file applies.
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      multipleStatements: true,
    })
    try {
      // ANSI_QUOTES so the migrations' "double-quote" identifiers parse; disable
      // FK checks so cross-table FKs created out of dependency order don't fail.
      await connection.query("SET SESSION sql_mode=CONCAT(@@sql_mode, ',ANSI_QUOTES')")
      await connection.query('SET FOREIGN_KEY_CHECKS=0')

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
      const { applied, adopting } = await openLedger(connection)
      let skipped = 0

      for (const file of sqlFiles) {
        // A recorded file never runs again: a DROP or a backfill in it would repeat on
        // every boot (X1 flash-m39).
        if (applied.has(file)) {
          skipped++
          continue
        }
        // Migrations are authored in Postgres dialect; translate the strict-MySQL
        // incompatibilities (types, functions, index syntax/prefixes) before exec.
        const sql = translateDdlToMysql(readFileSync(join(migrationsDir, file), 'utf-8'))
        try {
          await connection.query(sql)
          await record(connection, file)
          console.log(`✓ ${file}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          if (isIdempotencyError(err)) {
            if (adopting) {
              // Ran on an earlier boot, before this database kept a record.
              await record(connection, file)
              console.warn(`⚠ ${file}: ${msg} (applied before; now recorded)`)
            } else {
              // A multi-statement query stops at the failing statement. Not recorded,
              // so it is retried, and the log says what did not happen.
              console.warn(
                `⚠ ${file}: ${msg} — the statements after this one did NOT run; ` +
                  'move them to a new migration file',
              )
            }
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
      await connection.end()
    }
  }
}
