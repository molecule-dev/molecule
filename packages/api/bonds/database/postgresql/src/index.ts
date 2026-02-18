/**
 * The PostgreSQL client.
 *
 * @module
 */

import pg from 'pg'

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
 * @returns The shared `DatabasePool` instance.
 */
function getPoolInstance(): DatabasePool {
  if (!_pool) {
    _pool = wrapPool(
      !process.env.DATABASE_URL
        ? new pg.Pool()
        : new pg.Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
          }),
    )
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
