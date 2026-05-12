/**
 * Postgres migration runner factory.
 *
 * The fleet's per-app `api/src/scripts/migrate.ts` was 96 lines of
 * byte-identical migration plumbing — connecting to Postgres, creating
 * the target database if missing, then running every `*.sql` file in
 * the project's `migrations/` directory in lexical order.
 *
 * `createMigrator(migrationsDir)` returns a no-arg `runMigrations()`
 * function bound to the given migrations directory. Apps pass their
 * own resolved path (computed against `import.meta.url`) so the
 * dynamic file scan still reads from the app's filesystem.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import pg from 'pg'

const DEFAULT_DB_NAME = 'myapp'

function deriveSsl(databaseUrl: string): pg.ConnectionConfig['ssl'] {
  const isLocal =
    databaseUrl.includes('localhost') ||
    databaseUrl.includes('127.0.0.1') ||
    databaseUrl.startsWith('postgres:///') ||
    databaseUrl.startsWith('postgresql:///')
  return isLocal ? false : { rejectUnauthorized: false }
}

function deriveDbName(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).pathname.replace(/^\//, '') || DEFAULT_DB_NAME
  } catch {
    return DEFAULT_DB_NAME
  }
}

/**
 * Returns a `runMigrations()` function bound to the given directory.
 *
 * @param migrationsDir - Absolute path to the directory containing
 *   ordered `*.sql` migration files. Resolve via
 *   `join(new URL('.', import.meta.url).pathname, '../../migrations')`
 *   from the app's `scripts/migrate.ts`.
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
          // IF NOT EXISTS tables are idempotent — log but don't fail
          console.warn(`⚠ ${file}: ${msg}`)
        }
      }
    }

    await client.end()
    console.log('Migrations complete.')
  }
}
