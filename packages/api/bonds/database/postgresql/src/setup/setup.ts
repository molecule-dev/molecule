/**
 * Quickly initialize the PostgreSQL database with `npm run setup-database`.
 *
 * @remarks
 * This runs ad hoc `*.sql` files under `**\/__setup__/` (default glob) against
 * `DATABASE_URL` — for one-off bootstrap scripts (grants, extensions, seed data).
 * Table schema itself belongs in versioned `migrations/*.sql` (see `createMigrator`
 * in this package's index), not here.
 *
 * A prior version of this module also ran a SUPERPGUSER-authenticated
 * "superuser path" (`role.sql` + `database.sql`) to provision the app's role and
 * database on a self-hosted server. It was removed: no `.sql` files with those
 * names ever shipped in this package (the path was dead-on-arrival — every
 * `SUPERPGUSER` run hit `ENOENT` and, because failures were swallowed, exited 0
 * having done nothing). If you need that bootstrap flow, provision the role and
 * database with `psql`/`createuser`/`createdb` directly, or drop your own SQL
 * files under `**\/__setup__/` and run this without `SUPERPGUSER`.
 *
 * @module
 */

// Import types for global augmentation (DATABASE_URL/PGDATABASE/PGUSER/PGPASSWORD).
import './types.js'
import fs from 'fs'
import { glob } from 'glob'
import path from 'path'
import pg from 'pg'
import process from 'process'

import { getLogger } from '@molecule/api-bond'

import { deriveSsl } from '../ssl.js'

const logger = getLogger()

/**
 * The default SQL files contain placeholder values which should be replaced.
 */
export const replacements: Record<string, string> = {
  'molecule-database': process.env.PGDATABASE || 'molecule-database',
  'molecule-user': process.env.PGUSER || 'molecule-user',
  'molecule-password': process.env.PGPASSWORD || 'molecule-password',
}

/**
 * Executes the SQL contained within some file, replacing placeholder values as necessary.
 *
 * Every occurrence of each `replacements` key is substituted — not just the
 * first — so a SQL file mentioning e.g. `molecule-database` twice (once in a
 * `CREATE DATABASE`, again in a later `GRANT`) has BOTH occurrences replaced.
 *
 * @param client - The PostgreSQL client instance to execute the query on.
 * @param sqlFilename - The path to the SQL file to execute.
 * @throws Re-throws the underlying query error after logging it — a broken
 *   setup file must fail the run, not silently leave the database
 *   half-provisioned while `setup()` reports success.
 */
export const runSQL = async (client: pg.Client, sqlFilename: string): Promise<void> => {
  let sql = fs.readFileSync(sqlFilename).toString()

  for (const key in replacements) {
    sql = sql.replaceAll(key, replacements[key] || key)
  }

  try {
    await client.query(sql)

    logger.info(`Successfully executed ${path.basename(sqlFilename)}.`)
  } catch (error) {
    logger.error(`Error executing ${path.basename(sqlFilename)}:`, error)
    throw error
  }
}

/**
 * Sets up the database by executing all SQL files.
 *
 * @param sqlPattern - Glob pattern to find SQL files (default: `**\/__setup__/*.sql`)
 * @param basePath - Base path for finding SQL files
 * @throws When any `*.sql` file fails to execute — every file is still attempted
 *   (so the thrown message can list every failure at once), but the run exits
 *   non-zero instead of "succeeding" having applied only some of the files.
 */
export const setup = async (
  sqlPattern = `**/__setup__/*.sql`,
  basePath = process.cwd(),
): Promise<void> => {
  const SQLFilenames = await glob(sqlPattern, { cwd: basePath, absolute: true })

  const client = !process.env.DATABASE_URL
    ? new pg.Client()
    : new pg.Client({
        connectionString: process.env.DATABASE_URL,
        // Verify-by-default via the shared helper: a remote DB's server
        // certificate is checked against the system CA store, relaxing ONLY on
        // explicit operator opt-out (was an unconditional rejectUnauthorized:false).
        ssl: deriveSsl(process.env.DATABASE_URL),
      })

  await client.connect()

  const failures: string[] = []
  try {
    for (const SQLFilename of SQLFilenames) {
      try {
        await runSQL(client, SQLFilename)
      } catch (error) {
        failures.push(
          `${path.basename(SQLFilename)}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  } finally {
    await client.end()
  }

  if (failures.length > 0) {
    throw new Error(
      `setup() failed — ${failures.length} SQL file(s) errored; the database is left ` +
        `partially provisioned:\n${failures.map((f) => `  - ${f}`).join('\n')}`,
    )
  }
}
