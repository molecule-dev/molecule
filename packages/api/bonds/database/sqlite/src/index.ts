/**
 * SQLite database provider for molecule.dev.
 *
 * Provides DatabasePool and DataStore implementations backed by
 * better-sqlite3. Ideal for lightweight services, status pages,
 * and single-instance deployments.
 *
 * @example
 * ```typescript
 * import { setPool, setStore } from '@molecule/api-database'
 * import { pool, store } from '@molecule/api-database-sqlite'
 *
 * setPool(pool)
 * setStore(store)
 * ```
 *
 * @remarks
 * Configure via the SQLITE_PATH environment variable (default: ./data/app.db).
 * WAL mode and foreign key constraints are enabled by default.
 *
 * @module
 */

export * from './pool.js'
export * from './store.js'
export * from './types.js'
export * from './utilities.js'

import type { DatabasePool } from '@molecule/api-database'

import { createPool } from './pool.js'
import { createStore } from './store.js'

/**
 * Lazily-initialized default pool.
 */
let _pool: DatabasePool | null = null

/**
 * Returns the lazily-initialized default pool, creating it on first call.
 * @returns The singleton DatabasePool instance.
 */
function getPoolInstance(): DatabasePool {
  if (!_pool) {
    _pool = createPool()
  }
  return _pool
}

/**
 * The SQLite connection pool instance.
 */
export const pool: DatabasePool = new Proxy({} as DatabasePool, {
  get(_, prop, receiver) {
    return Reflect.get(getPoolInstance(), prop, receiver)
  },
})

/**
 * Default DataStore instance backed by the default pool.
 */
let _store: ReturnType<typeof createStore> | null = null

/**
 * Default DataStore proxy backed by the lazily-initialized default pool.
 */
export const store = new Proxy({} as ReturnType<typeof createStore>, {
  get(_, prop, receiver) {
    if (!_store) _store = createStore(getPoolInstance())
    return Reflect.get(_store, prop, receiver)
  },
})
