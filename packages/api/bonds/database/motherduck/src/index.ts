/**
 * MotherDuck database provider for molecule.dev — hosted DuckDB in the cloud,
 * reached through the same `@duckdb/node-api` client with an `md:` connection
 * string.
 *
 * MotherDuck is built in partnership with DuckDB's creators and runs DuckDB
 * SQL, so everything true of the `@molecule/api-database-duckdb` bond is true
 * here — same placeholders, same DataStore, same migrations — with the
 * database living in your MotherDuck account instead of a local file. Pick
 * this bond when several processes or machines need one analytical database,
 * or when the data is already in MotherDuck.
 *
 * @example
 * ```typescript
 * import { setPool, setStore } from '@molecule/api-database'
 * import { pool, store } from '@molecule/api-database-motherduck'
 *
 * setPool(pool)
 * setStore(store)
 * ```
 *
 * @remarks
 * Configure via environment variables: `MOTHERDUCK_TOKEN` (required —
 * create it in the MotherDuck UI under Settings → "+ Create token"; the
 * client also auto-reads a lowercase `motherduck_token` env var by itself)
 * and `MOTHERDUCK_DATABASE` (the `md:` connection string; default `md:` for
 * the account's default database, `md:my_db` for a named one).
 * - **A missing token fails with the tagged config error**
 *   (`config.notConfigured`, HTTP 503) naming where to create one — not an
 *   opaque vendor 401. The token is read at first use, never at import time.
 * - **Instances are cached (`DuckDBInstance.fromCache`), mandatory.** The
 *   Node client does not cache `md:` instances by default and every bare
 *   `create()` re-fetches the remote catalog; this bond always goes through
 *   the cache, so repeated pools on one connection string share one instance.
 * - **One connection, serialized like the duckdb bond.** Every statement runs
 *   on one long-lived connection behind a FIFO queue — MotherDuck itself
 *   recommends long-lived connections. A `transaction()` holds the queue for
 *   its whole `BEGIN` → … → `COMMIT`/`ROLLBACK` lifetime.
 * - **MotherDuck runs DuckDB SQL, not PostgreSQL SQL.** Local files and
 *   attachments, `INSTALL`/`LOAD`, `SET`, and temp tables are NOT available
 *   through `md:` — `read_parquet('s3://…')` and `https://` paths work; a
 *   local `./data.parquet` does not (the file is on YOUR disk, not
 *   MotherDuck's).
 * - **JSON columns read as JSON TEXT through raw `query()`** (the duckdb
 *   bond's caveat — DuckDB's `JSON` type is VARCHAR underneath); the
 *   DataStore CRUD helpers parse JSON-typed columns for you.
 * - Migrations: the duckdb bond's runner on this pool — same ledger
 *   (`_molecule_migrations`), same Postgres-dialect translation and the same
 *   limits: partial indexes are translated without changing behaviour, while
 *   an `ON DELETE`/`ON UPDATE` referential action throws
 *   `UnsupportedSqlFeatureError` (DuckDB cannot reproduce it, so the
 *   generator's compatibility preflight refuses that resource/database pair —
 *   see {@link sqlCapabilities}).
 * - `pool.end()` closes this pool's connection. The cached instance stays
 *   alive for the process (MotherDuck's `dbinstance_inactivity_ttl`, default
 *   15 minutes, retires idle instances server-side).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './capabilities.js'
export * from './migrator.js'
export * from './pool.js'
export * from './secrets.js'
export * from './store.js'
export * from './types.js'

import type { DatabasePool } from '@molecule/api-database'
// Subpath import (not the barrel) so importing this bond does NOT fire the
// duckdb bond's own lifecycle registration on its default pool.
import { registerLifecycleIntegration } from '@molecule/api-database-duckdb/lifecycle.js'

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
 * The MotherDuck connection pool instance.
 */
export const pool: DatabasePool = new Proxy({} as DatabasePool, {
  get(_, prop, receiver) {
    return Reflect.get(getPoolInstance(), prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    return Reflect.set(getPoolInstance(), prop, value)
  },
})

/**
 * Whether the lazy default pool has been created.
 *
 * Readiness and shutdown wiring must not FORCE a connection.
 *
 * @returns `true` once the default pool exists.
 */
export const defaultPoolCreated = (): boolean => _pool !== null

/**
 * Close the lazy default pool, if it was created.
 *
 * @returns Resolves once the pool has ended.
 */
export const closeDefaultPool = async (): Promise<void> => {
  const current = _pool
  _pool = null
  if (current) await current.end()
}

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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_store) _store = createStore(getPoolInstance())
    return Reflect.set(_store, prop, value)
  },
})

// Register the readiness probe and shutdown hook once, when this bond is
// imported; the core queues them until a lifecycle provider is bonded.
registerLifecycleIntegration({
  ping: async () => {
    await pool.query('SELECT 1')
  },
  close: closeDefaultPool,
  created: defaultPoolCreated,
})
