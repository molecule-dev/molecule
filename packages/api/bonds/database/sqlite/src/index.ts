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
 * - **Schema changes are `*.sql` files in the app's `api/migrations/`.** A
 *   scaffolded API applies every file in lexical order each time it starts
 *   (`server.ts` runs `createMigrator`), so a new file applies on the next
 *   restart; write `CREATE TABLE IF NOT EXISTS`. Postgres-dialect DDL is
 *   translated (`gen_random_uuid()`, `now()`, `::` casts, `USING <method>`),
 *   so the same file works on the postgres bond.
 * - **`pool.query(text, values)` takes Postgres-style `$1, $2` placeholders**
 *   (converted to `?` and reordered) or plain `?` placeholders.
 * - **`pool.transaction()` calls and plain `pool.query()` calls are serialized**
 *   behind an internal FIFO queue (better-sqlite3 has only ONE shared connection
 *   — there is no per-transaction isolation). A `transaction()` holds the queue
 *   for its whole `BEGIN` → … → `COMMIT`/`ROLLBACK` lifetime, so a concurrent
 *   `transaction()` or `query()` call waits its turn instead of racing `BEGIN`
 *   or silently running inside — and being discarded by — someone else's
 *   rollback. Don't hold a transaction open across an `await` on unrelated
 *   work; every other query on this pool queues behind it until it resolves.
 * - **`like` is case-insensitive and does NOT escape the value** — the caller's
 *   own `%`/`_` are honored as wildcards, identical to the postgresql/mysql
 *   bonds. For human-typed search input, use `ilike` instead (escapes + auto-
 *   wraps `%…%`) — see `WhereCondition['operator']` in `@molecule/api-database`.
 * - **A migration file with a genuine error** (not an idempotent "already
 *   exists"/"duplicate column name") now FAILS the boot with every broken file
 *   named, instead of warn-logging and booting with a partial schema.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './migrator.js'
export * from './pool.js'
export * from './secrets.js'
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    return Reflect.set(getPoolInstance(), prop, value)
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_store) _store = createStore(getPoolInstance())
    return Reflect.set(_store, prop, value)
  },
})
