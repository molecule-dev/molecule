/**
 * DuckDB database provider for molecule.dev — an embedded analytical SQL
 * engine that queries Parquet, CSV and JSON files in-process.
 *
 * Provides DatabasePool and DataStore implementations backed by
 * `@duckdb/node-api` (DuckDB 2.0). DuckDB is the SQLite shape, but
 * columnar/OLAP: it is the right bond for analytics over files
 * (`SELECT * FROM read_parquet('events.parquet')`), aggregations and ad-hoc
 * slices — not for a high-write-rate OLTP app (that is the postgresql bond's
 * job).
 *
 * DuckDB cannot reproduce a foreign key's `ON DELETE`/`ON UPDATE` `CASCADE`,
 * `SET NULL` or `SET DEFAULT` action, and this bond refuses to silently drop
 * it: a resource whose setup SQL needs one is refused by the generator's
 * compatibility preflight ({@link sqlCapabilities}) before an app is built.
 *
 * @example
 * ```typescript
 * import { setPool, setStore } from '@molecule/api-database'
 * import { pool, store } from '@molecule/api-database-duckdb'
 *
 * setPool(pool)
 * setStore(store)
 * ```
 *
 * @remarks
 * Configure via the `DUCKDB_PATH` environment variable (default:
 * `./data/app.duckdb`; `:memory:` for a database that lives only for the
 * process's lifetime).
 * - **`pool.query(text, values)` takes Postgres-style `$1, $2` placeholders —
 *   or `?` — natively, with no translation.** With VALUES a string must be
 *   ONE statement (the client prepares it); without values a multi-statement
 *   string runs in full and the LAST statement's result is returned.
 *   `rowCount` follows node-postgres: rows returned for a SELECT or
 *   `…RETURNING` statement, rows changed for plain INSERT/UPDATE/DELETE,
 *   `null` for DDL.
 * - **One process per file, in read-write mode.** DuckDB holds a file lock:
 *   the dev server and a CLI must never open the same `.duckdb` file
 *   read-write at the same time (`Could not set lock on file`). This pool
 *   shares one instance per file inside the process (`fromCache`) and
 *   serializes every statement on ONE connection behind a FIFO queue, the
 *   sqlite bond's model — a `transaction()` holds the queue for its whole
 *   `BEGIN` → … → `COMMIT`/`ROLLBACK` lifetime. A second PROCESS wanting
 *   concurrent reads should open `readOnly: true`.
 * - **Resource defaults differ from DuckDB's own.** DuckDB defaults to 80% of
 *   RAM for `memory_limit` and one thread per core — enough to eat a shared
 *   host. This bond defaults to `memory_limit: '1GB'` and `threads: 4`,
 *   overridable via `DUCKDB_MEMORY_LIMIT` / `DUCKDB_THREADS` or the
 *   `memoryLimit`/`threads` config fields.
 * - **Files are the point:** `read_parquet`, `read_csv`, `read_json` and the
 *   `'file.parquet'` shorthand all work through `pool.query()` as plain SQL.
 *   They read relative to the API process's working directory.
 * - **JSON columns read as JSON TEXT through raw `query()`** — DuckDB's
 *   `JSON` type is an alias over VARCHAR, so the type is invisible in result
 *   metadata. The DataStore CRUD helpers (`create`, `findMany`, …) parse
 *   JSON-typed columns for you; in raw SQL use `data -> 'key'` /
 *   `json_extract` or accept the string.
 * - **`COUNT(*)` and BIGINT come back as JS numbers** when they fit
 *   `Number.MAX_SAFE_INTEGER` (raw DuckDB returns `bigint`, which
 *   `JSON.stringify` throws on); a larger value becomes its decimal string,
 *   matching node-postgres.
 * - **Schema changes are `*.sql` files in the app's `api/migrations/`**,
 *   applied in lexical order on startup by `createMigrator`. Postgres-dialect
 *   DDL applies after a translation that keeps behaviour: `jsonb` → `json`,
 *   index `USING <method>` dropped, and a partial index applied as a full index
 *   or (UNIQUE) as a `CASE WHEN` expression index. `gen_random_uuid()`,
 *   `now()`, `ADD/DROP COLUMN IF [NOT] EXISTS`, `::` casts and `uuid`/
 *   `timestamptz`/`bytea`/`text[]` types are native. An `ON DELETE`/
 *   `ON UPDATE` referential action throws `UnsupportedSqlFeatureError` —
 *   DuckDB cannot reproduce it; each file runs once (recorded in
 *   `_molecule_migrations`) and in one transaction.
 * - **2.0 file format is a one-way break:** versions before DuckDB 2.0 cannot
 *   read files this bond creates (2.0 still reads 1.x files). The engine is
 *   OLAP — bulk scans and aggregations are its home; an app doing many small
 *   row transactions belongs on the postgresql bond.
 * - `pool.end()` closes the pool's connection; a FILE-backed instance is
 *   process-lifetime by design (the client's instance cache has no eviction).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './capabilities.js'
export * from './instances.js'
export * from './lifecycle.js'
export * from './migrator.js'
export * from './pool.js'
export * from './queue.js'
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
 * The DuckDB connection pool instance.
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
