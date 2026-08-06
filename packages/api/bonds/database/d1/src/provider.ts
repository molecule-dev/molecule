/**
 * Cloudflare D1 database provider.
 *
 * @module
 */

import type { DatabasePool, DataStore } from '@molecule/api-database'
import { createStore } from '@molecule/api-database-sqlite/store.js'

import { createPool } from './pool.js'
import type { D1Config } from './types.js'

/**
 * Creates a D1-backed `DataStore`.
 *
 * The store is `@molecule/api-database-sqlite`'s, unchanged: D1 speaks SQLite,
 * so the dialect is shared and only the pool differs. That is why this bond is
 * small — the sqlite store was already written against the abstract
 * `DatabasePool` rather than against its native driver.
 *
 * @param config - The D1 binding from the Worker's `env`.
 * @returns A DataStore backed by D1.
 */
export const createProvider = (config: D1Config): DataStore => createStore(createPool(config))

/**
 * Creates the D1 pool on its own, for callers that want raw SQL access
 * alongside the DataStore.
 *
 * @param config - The D1 binding from the Worker's `env`.
 * @returns A DatabasePool backed by D1.
 */
export const createDatabasePool = (config: D1Config): DatabasePool => createPool(config)
