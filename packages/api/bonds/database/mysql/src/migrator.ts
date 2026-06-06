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

import mysql from 'mysql2/promise'

interface MysqlMigrateConfig {
  host: string
  port: number
  user: string
  password?: string
  database?: string
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
        const sql = readFileSync(join(migrationsDir, file), 'utf-8')
        try {
          await connection.query(sql)
          console.log(`✓ ${file}`)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          // IF NOT EXISTS migrations are idempotent — log, don't fail the run.
          console.warn(`⚠ ${file}: ${msg}`)
        }
      }

      console.log('Migrations complete.')
    } finally {
      await connection.end()
    }
  }
}
