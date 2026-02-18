/**
 * Quickly initialize the PostgreSQL database with `npm run setup-database`.
 *
 * @module
 */

// Import types for global augmentation
import './types.js'
import fs from 'fs'
import { glob } from 'glob'
import path from 'path'
import pg from 'pg'
import process from 'process'
import { fileURLToPath } from 'url'

import { getLogger } from '@molecule/api-bond'

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
 * The SQL filenames which set up our user role and database, requiring a superuser role.
 * @param client - The client instance.
 * @param sqlFilename - The sql filename.
 */
export const superSQLFilenames = [`role.sql`, `database.sql`]

/**
 * Executes the SQL contained within some file, replacing placeholder values as necessary.
 * @param client - The PostgreSQL client instance to execute the query on.
 * @param sqlFilename - The path to the SQL file to execute.
 */
export const runSQL = async (client: pg.Client, sqlFilename: string): Promise<void> => {
  try {
    let sql = fs.readFileSync(sqlFilename).toString()

    for (const key in replacements) {
      sql = sql.replace(key, replacements[key] || key)
    }

    await client.query(sql)

    logger.info(`Successfully executed ${path.basename(sqlFilename)}.`)
  } catch (error) {
    logger.error(`Error executing ${path.basename(sqlFilename)}:`, error)
  }
}

/**
 * Sets up the database by executing all SQL files.
 *
 * @param sqlPattern - Glob pattern to find SQL files (default: `**\/__setup__/*.sql`)
 * @param basePath - Base path for finding SQL files
 */
export const setup = async (
  sqlPattern = `**/__setup__/*.sql`,
  basePath = process.cwd(),
): Promise<void> => {
  const SQLFilenames = await glob(sqlPattern, { cwd: basePath, absolute: true })

  if (process.env.SUPERPGUSER) {
    const __dirname = fileURLToPath(path.dirname(import.meta.url))
    const superClient = new pg.Client({
      user: process.env.SUPERPGUSER,
      password: process.env.SUPERPGPASSWORD,
      host: process.env.SUPERPGHOST || process.env.PGHOST,
      database: process.env.SUPERPGHOST || process.env.SUPERPGUSER,
      port: Number(process.env.SUPERPGPORT || process.env.PGPORT),
    })

    await superClient.connect()

    for (const SQLFilename of superSQLFilenames) {
      await runSQL(superClient, path.join(__dirname, SQLFilename))
    }

    await superClient.end()
  }

  const client = !process.env.DATABASE_URL
    ? new pg.Client()
    : new pg.Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      })

  await client.connect()

  for (const SQLFilename of SQLFilenames) {
    await runSQL(client, SQLFilename)
  }

  await client.end()
}
