/**
 * The PostgreSQL client.
 *
 * @module
 */

import pg from 'pg'

import { getLogger } from '@molecule/api-bond'
import type { DatabaseConfig, DatabaseConnection, DatabasePool } from '@molecule/api-database'

export * as setup from './setup/index.js'

/**
 * Wraps a `pg.Pool` instance into a `DatabasePool`-compatible interface,
 * adapting query results and connection management.
 *
 * @param pgPool - The underlying `pg.Pool` to wrap.
 * @returns A `DatabasePool` that delegates to the provided pg pool.
 */
function wrapPool(pgPool: pg.Pool): DatabasePool {
  // Set statement_timeout on each new connection to prevent runaway queries
  pgPool.on('connect', (client: pg.PoolClient) => {
    client
      .query("SET statement_timeout = '30s'; SET idle_in_transaction_session_timeout = '60s';")
      .catch(() => {})
  })

  // Handle errors from idle clients in the pool to prevent unhandled exceptions
  // that would crash the process (e.g., network interruption, server restart).
  pgPool.on('error', (err: Error) => {
    getLogger().error('Unexpected error on idle database client', err.message)
  })

  return {
    async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
      const result = await pgPool.query<T & pg.QueryResultRow>(text, values)
      return {
        rows: result.rows as T[],
        rowCount: result.rowCount,
        fields: result.fields?.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
      }
    },

    async connect(): Promise<DatabaseConnection> {
      const client = await pgPool.connect()
      return {
        async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
          const result = await client.query<T & pg.QueryResultRow>(text, values)
          return {
            rows: result.rows as T[],
            rowCount: result.rowCount,
            fields: result.fields?.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
          }
        },
        release() {
          client.release()
        },
      }
    },

    async end() {
      await pgPool.end()
    },

    stats() {
      return {
        total: pgPool.totalCount,
        idle: pgPool.idleCount,
        waiting: pgPool.waitingCount,
      }
    },
  }
}

/**
 * Lazily-initialized default pool. Created on first property access so that
 * process.env.DATABASE_URL has been populated by resolveAll() first.
 */
let _pool: DatabasePool | null = null
/**
 * Returns the lazily-initialized default pool, creating it from
 * `DATABASE_URL` env var on first access.
 *
 * @param url - The PostgreSQL connection URL to check.
 * @returns `true` if the URL points to a local database.
 */
function isLocalUrl(url: string): boolean {
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.startsWith('postgres:///') ||
    url.startsWith('postgresql:///')
  )
}

/**
 * Returns the lazily-initialized default pool, creating it from
 * `DATABASE_URL` env var on first access.
 * @returns The shared `DatabasePool` instance.
 */
function getPoolInstance(): DatabasePool {
  if (!_pool) {
    const url = process.env.DATABASE_URL
    const poolConfig: pg.PoolConfig = url
      ? {
          connectionString: url,
          ssl: isLocalUrl(url)
            ? false
            : process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false'
              ? { rejectUnauthorized: false }
              : true,
        }
      : {}

    // Production-safe defaults: prevent runaway queries and idle transactions.
    // Pool size of 100 handles thousands of concurrent users while staying within
    // PostgreSQL's default max_connections (100). Tune via DATABASE_POOL_MAX if needed.
    poolConfig.max = poolConfig.max ?? parseInt(process.env.DATABASE_POOL_MAX ?? '100', 10)
    poolConfig.connectionTimeoutMillis = poolConfig.connectionTimeoutMillis ?? 10_000
    poolConfig.idleTimeoutMillis = poolConfig.idleTimeoutMillis ?? 30_000

    _pool = wrapPool(new pg.Pool(poolConfig))
  }
  return _pool
}

/**
 * The PostgreSQL connection pool instance.
 *
 * Example usage:
 * ```ts
 * import * as Database from '@molecule/api-database-postgresql'
 *
 * const queryDB = async () => {
 *   const result = await Database.pool.query(`SELECT * FROM "table"`)
 *
 *   // ...
 *
 *   return result?.rows
 * }
 * ```
 */
export const pool: DatabasePool = new Proxy({} as DatabasePool, {
  get(_, prop, receiver) {
    return Reflect.get(getPoolInstance(), prop, receiver)
  },
})

/**
 * Creates a new pool with custom configuration.
 *
 * Use this when you need a pool with different settings than the default.
 *
 * @param config - Database connection configuration (host, port, user, password, SSL, pool size).
 * @returns A new `DatabasePool` backed by a fresh pg connection pool.
 */
export const createPool = (config?: DatabaseConfig): DatabasePool =>
  wrapPool(
    new pg.Pool({
      connectionString: config?.connectionString,
      host: config?.host,
      port: config?.port,
      database: config?.database,
      user: config?.user,
      password: config?.password,
      max: config?.max,
      min: config?.min,
      connectionTimeoutMillis: config?.connectionTimeoutMillis,
      idleTimeoutMillis: config?.idleTimeoutMillis,
      ssl: config?.ssl,
    }),
  )

/**
 * DataStore implementation backed by this pool.
 *
 * @example
 * ```ts
 * import { store } from '@molecule/api-database-postgresql'
 * import { setStore } from '@molecule/api-database'
 *
 * setStore(store)
 * ```
 */
export * from './store.js'

import { createStore } from './store.js'

/**
 * Default DataStore instance backed by the default pool.
 * Lazily initialized via Proxy to defer until after secrets resolution.
 */
let _store: ReturnType<typeof createStore> | null = null
/** Lazily-initialized default `DataStore` backed by the default pool. */
export const store = new Proxy({} as ReturnType<typeof createStore>, {
  get(_, prop, receiver) {
    if (!_store) _store = createStore(getPoolInstance())
    return Reflect.get(_store, prop, receiver)
  },
})
