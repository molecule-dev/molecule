/**
 * {@link connectRemote} entry point — dispatches to the per-engine client
 * implementation and (in production) lazy-imports the underlying driver.
 *
 * @module
 */

import type { MysqlPoolFactory, PgPoolFactory, SqliteDbFactory } from './driverTypes.js'
import { createMysqlRemoteDb, defaultMysqlPoolFactory, parseMysqlDatabase } from './mysql-client.js'
import { createPgRemoteDb, DEFAULT_POOL_SIZE, defaultPgPoolFactory } from './pg-client.js'
import { createSqliteRemoteDb, defaultSqliteFactory } from './sqlite-client.js'
import { type RemoteDb, type RemoteDbConnection, RemoteDbError } from './types.js'

/**
 * Per-driver factory hooks — pass these to {@link connectRemote} to swap
 * the real `pg` / `mysql2` / `better-sqlite3` driver for a hand-rolled
 * mock during testing.
 */
export interface ConnectRemoteHooks {
  /** Factory for `pg.Pool`. Defaults to `(cfg) => new pg.Pool(cfg)`. */
  pgPoolFactory?: PgPoolFactory
  /** Factory for `mysql2/promise.createPool`. Defaults to the real one. */
  mysqlPoolFactory?: MysqlPoolFactory
  /** Factory for `better-sqlite3`. Defaults to `new BetterSqlite3(...)`. */
  sqliteFactory?: SqliteDbFactory
}

/**
 * Connect to a user-supplied remote database for inspection and query
 * execution. Distinct from the app's own DataStore — this is a separate
 * driver pool, keyed by `connection.url`, intended for the `database-admin`
 * flagship app and similar features where end-users register databases
 * to browse.
 *
 * Drivers are loaded lazily — only the engine the caller actually uses
 * will be `import()`ed, so missing optional peer deps (`pg`, `mysql2`,
 * `better-sqlite3`) only trip a `driver-not-installed` error when that
 * engine is selected.
 *
 * @param connection - Engine type, URL / path, optional read-only flag,
 *   optional pool size.
 * @param hooks - Optional driver-factory overrides for testing.
 * @returns A connected {@link RemoteDb}.
 * @throws {RemoteDbError} `code === 'invalid-config'` for empty `url`.
 * @throws {RemoteDbError} `code === 'unsupported-type'` for unknown `type`.
 * @throws {RemoteDbError} `code === 'driver-not-installed'` if the matching
 *   peer driver is not installed in the host project.
 * @throws {RemoteDbError} `code === 'connection-failed'` for transport /
 *   handshake failures.
 *
 * @example
 * ```ts
 * import { connectRemote } from '@molecule/api-database-remote'
 *
 * const db = await connectRemote({
 *   url: 'postgresql://reader:secret@db.example.com:5432/analytics',
 *   type: 'postgresql',
 *   readonly: true,
 * })
 *
 * try {
 *   const tables = await db.listTables('public')
 *   const result = await db.runQuery(
 *     'SELECT * FROM users WHERE created_at > $1 LIMIT 100',
 *     [new Date('2024-01-01')],
 *     { timeoutMs: 5_000, maxRows: 50 },
 *   )
 *   console.log(result.columns.map((c) => c.name), result.rows.length)
 * } finally {
 *   await db.disconnect()
 * }
 * ```
 */
export async function connectRemote(
  connection: RemoteDbConnection,
  hooks: ConnectRemoteHooks = {},
): Promise<RemoteDb> {
  if (!connection.url || typeof connection.url !== 'string') {
    throw new RemoteDbError('invalid-config', 'connection.url is required')
  }
  const readonly = connection.readonly === true
  const poolSize = connection.poolSize ?? DEFAULT_POOL_SIZE

  switch (connection.type) {
    case 'postgresql': {
      const factory = hooks.pgPoolFactory ?? (await defaultPgPoolFactory())
      let pool
      try {
        pool = factory({ connectionString: connection.url, max: poolSize })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new RemoteDbError('connection-failed', `Postgres connect failed: ${message}`, {
          cause: error,
        })
      }
      try {
        // Eagerly probe the pool so connection failures surface here, not
        // on the first user query.
        const probe = await pool.connect()
        try {
          probe.release()
        } catch {
          // ignore
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        try {
          await pool.end()
        } catch {
          // ignore
        }
        throw new RemoteDbError('connection-failed', `Postgres connect failed: ${message}`, {
          cause: error,
        })
      }
      return createPgRemoteDb(pool, readonly)
    }

    case 'mysql': {
      const factory = hooks.mysqlPoolFactory ?? (await defaultMysqlPoolFactory())
      let pool
      try {
        pool = factory({
          uri: connection.url,
          connectionLimit: poolSize,
          multipleStatements: false,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new RemoteDbError('connection-failed', `MySQL connect failed: ${message}`, {
          cause: error,
        })
      }
      try {
        // Probe with a trivial query so handshake errors surface up front.
        await pool.query('SELECT 1', [])
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        try {
          await pool.end()
        } catch {
          // ignore
        }
        throw new RemoteDbError('connection-failed', `MySQL connect failed: ${message}`, {
          cause: error,
        })
      }
      const defaultDb = parseMysqlDatabase(connection.url)
      return createMysqlRemoteDb(pool, defaultDb, readonly)
    }

    case 'sqlite': {
      const factory = hooks.sqliteFactory ?? (await defaultSqliteFactory())
      try {
        const db = factory(connection.url, { readonly })
        return createSqliteRemoteDb(db, readonly)
      } catch (error) {
        if (error instanceof RemoteDbError) throw error
        const message = error instanceof Error ? error.message : String(error)
        throw new RemoteDbError('connection-failed', `SQLite open failed: ${message}`, {
          cause: error,
        })
      }
    }

    default: {
      throw new RemoteDbError(
        'unsupported-type',
        `Unsupported remote database type: ${String(connection.type)}`,
      )
    }
  }
}
