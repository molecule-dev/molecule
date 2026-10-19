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
 *   scaffolded API applies new files in lexical order each time it starts
 *   (`server.ts` runs `createMigrator`), so a new file applies on the next
 *   restart; write `CREATE TABLE IF NOT EXISTS`. Each file runs ONCE: the
 *   `_molecule_migrations` table records it, and an edit to a recorded file
 *   does not run again — except that a column added to its `CREATE TABLE` is
 *   still added. Every other change to an applied schema goes in a NEW file. Postgres-dialect DDL is
 *   translated (`gen_random_uuid()`, `now()` / `CURRENT_TIMESTAMP`, `::` casts,
 *   `USING <method>`, `ADD COLUMN IF NOT EXISTS`), so the same file works on the postgres bond.
 * - **A `@molecule/api-resource-*` package's `src/__setup__/*.sql` is Postgres
 *   dialect and applies here as it is** — copy the file into `api/migrations/`
 *   unchanged. The migrator translates it on the way in (above), and a
 *   resource package's `uuid`/`timestamptz`/`jsonb` type names need no
 *   translation at all: SQLite takes them by affinity, and the store reads a
 *   `JSON`/`JSONB` column back as a parsed value. Never hand-write a SQLite
 *   version of a package's schema: a transcribed copy drifts from the schema
 *   that package's own queries expect, and the drift surfaces as `no such
 *   column` at runtime rather than at the migration.
 * - **A `DEFAULT now()` / `DEFAULT CURRENT_TIMESTAMP` column yields ISO-8601 UTC
 *   with milliseconds** (`2026-10-16T01:22:21.416Z`) — the format the other bonds
 *   and `new Date().toISOString()` produce. SQLite's own `current_timestamp` is
 *   space-separated, `Z`-less and whole-second, which `new Date()` reparses as
 *   LOCAL time and which ties for two rows written in the same second; the
 *   migrator translates those defaults so stored values are ISO and compare as
 *   strings in time order. A column a caller writes explicitly is left alone.
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
 * - **All-or-nothing writes: `withTransaction(async () => { … })` from
 *   `@molecule/api-database`.** Every call inside it — the CRUD helpers
 *   (`create`, `findMany`, `updateById`, …) and `query()` — joins the one
 *   transaction; it commits when the callback resolves, rolls back when it throws.
 *   Never call the CRUD helpers between a manual `pool.transaction()` and its
 *   `commit()`: they queue behind the transaction they belong to, and fail
 *   after 30 s with an error naming `withTransaction()`.
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
export * from './lifecycle.js'
export * from './migrator.js'
export * from './pool.js'
export * from './secrets.js'
export * from './store.js'
export * from './types.js'
export * from './utilities.js'

import type { DatabasePool } from '@molecule/api-database'

import { registerLifecycleIntegration } from './lifecycle.js'
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
