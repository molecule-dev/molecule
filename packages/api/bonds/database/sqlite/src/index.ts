/**
 * SQLite database provider for molecule.dev.
 *
 * Provides DatabasePool and DataStore implementations backed by
 * better-sqlite3. Ideal for lightweight services, status pages,
 * and single-instance deployments.
 *
 * @example
 * ```typescript
 * import { join } from 'node:path'
 *
 * import { create, findMany, setPool, setStore, updateById } from '@molecule/api-database'
 * import { createMigrator, pool, store } from '@molecule/api-database-sqlite'
 *
 * // Startup: apply migrations/*.sql to SQLITE_PATH (default ./data/app.db), then bond once.
 * await createMigrator(join(process.cwd(), 'migrations'))()
 * setPool(pool) // raw query() + transactions
 * setStore(store) // the CRUD API app code uses
 *
 * interface Post {
 *   id: string
 *   title: string
 *   status: 'draft' | 'published'
 * }
 *
 * // create() generates a uuid `id` when omitted (the table must have an `id` column).
 * const { data: draft } = await create<Post>('posts', { title: 'Hello SQLite', status: 'draft' })
 * if (draft) {
 *   await updateById<Post>('posts', draft.id, { status: 'published' })
 * }
 *
 * const published = await findMany<Post>('posts', {
 *   where: [{ field: 'status', operator: '=', value: 'published' }],
 *   orderBy: [{ field: 'title', direction: 'asc' }],
 *   limit: 20,
 * })
 * ```
 *
 * @remarks
 * - **Bond with `setStore(store)` (and `setPool(pool)` for raw SQL)** from
 *   `@molecule/api-database` — not `bond('database-sqlite', ...)`. Configure the file via the
 *   `SQLITE_PATH` env var (default `./data/app.db`; the parent directory is created for you).
 *   WAL mode and foreign key constraints are enabled by default.
 * - **One file, one process.** better-sqlite3 is a native, synchronous driver on local disk:
 *   it does not run on Cloudflare Workers (use `@molecule/api-database-d1`) and the data is lost
 *   on hosts with an ephemeral filesystem unless `SQLITE_PATH` points at a persistent volume.
 * - **Migrations may be written in Postgres dialect** — the migrator translates
 *   `gen_random_uuid()`, `now()`, `::casts` and index `USING` clauses. Booleans are stored as
 *   0/1 and objects/arrays as JSON text.
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
