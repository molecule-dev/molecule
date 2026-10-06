/**
 * The package's default pool and store, opened lazily on first use.
 *
 * @module
 */

import type { DataStore } from '@molecule/api-database'

import { createPool } from './pool.js'
import { createStore } from './store.js'
import type { PglitePool } from './types.js'

let _pool: PglitePool | null = null
let _store: DataStore | null = null

/**
 * Returns the default pool, created on first call from `PGLITE_DATA_DIR`
 * (read then, not at import, so env loading can run first).
 *
 * @returns The shared default pool.
 */
export function getPoolInstance(): PglitePool {
  if (!_pool) _pool = createPool()
  return _pool
}

/**
 * The default PGlite pool. Bond it with `setPool(pool)`.
 */
export const pool: PglitePool = new Proxy({} as PglitePool, {
  get(_, prop) {
    const target = getPoolInstance()
    const value: unknown = Reflect.get(target, prop, target)
    return typeof value === 'function' ? value.bind(target) : value
  },
  // set trap: without it a write lands on the dummy target and is lost.
  set(_, prop, value) {
    return Reflect.set(getPoolInstance(), prop, value)
  },
})

/**
 * The default DataStore, backed by the default pool. Bond it with `setStore(store)`.
 */
export const store: DataStore = new Proxy({} as DataStore, {
  get(_, prop) {
    if (!_store) _store = createStore(getPoolInstance())
    return Reflect.get(_store, prop, _store)
  },
  // set trap: without it a write lands on the dummy target and is lost.
  set(_, prop, value) {
    if (!_store) _store = createStore(getPoolInstance())
    return Reflect.set(_store, prop, value)
  },
})
