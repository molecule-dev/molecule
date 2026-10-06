/**
 * PGlite database provider for molecule.dev — real Postgres (compiled to
 * WebAssembly) running inside your own process, with no database server.
 *
 * This is the **development / in-browser profile** of the database: the same
 * Postgres SQL, the same `$1` placeholders, the same error codes and the same
 * DataStore SQL as `@molecule/api-database-postgresql`, so app code written
 * against `@molecule/api-database` runs unchanged on both. Develop on PGlite;
 * in production bond the postgresql provider instead — swap the import, keep
 * the app code and the migrations.
 *
 * @example
 * ```typescript
 * import { setPool, setStore } from '@molecule/api-database'
 * import { createMigrator, pool, store } from '@molecule/api-database-pglite'
 *
 * // Data directory comes from PGLITE_DATA_DIR (default ./data/pglite under Node).
 * setPool(pool)
 * setStore(store)
 *
 * // Same migrations folder the postgresql bond reads; runs on the same pool.
 * await createMigrator(new URL('../migrations', import.meta.url).pathname)()
 * ```
 *
 * @example
 * ```typescript
 * // Explicit pools: in memory (tests), on disk, or in IndexedDB.
 * import { applyMigrations, createPool, createStore } from '@molecule/api-database-pglite'
 *
 * const testPool = createPool({ dataDir: 'memory://' })
 * const diskPool = createPool({ dataDir: './data/pglite' })
 * const browserPool = createPool({ dataDir: 'idb://my-app' })
 *
 * // Without a filesystem, pass the SQL in (e.g. bundled with Vite's ?raw).
 * await applyMigrations(browserPool, [{ name: '0001_init.sql', sql: initSql }])
 * const store = createStore(browserPool)
 *
 * // Production: the same app code against the real server.
 * // import { pool, store } from '@molecule/api-database-postgresql'
 * ```
 *
 * @remarks
 * - **Exactly ONE connection.** PGlite is a single Postgres backend, so the pool
 *   serializes everything: plain `query()` calls queue in order; `connect()`
 *   and `transaction()` hold the connection until `release()` /
 *   `commit()` / `rollback()`. Never call `pool.query()` or a store helper
 *   (`create`, `findMany`, …) while YOUR code holds a connection or an open
 *   transaction — on Postgres that runs on a second connection, here it waits
 *   for the one you hold. After `acquireTimeoutMillis` (default 10 s) it fails
 *   with an error saying a connection is held, instead of hanging. Inside a
 *   transaction run every statement on that transaction's own `query()`, and
 *   always release in `finally` (the same rule the postgresql bond needs).
 * - **Where data lives** (`dataDir`, else `PGLITE_DATA_DIR`): a filesystem path
 *   (Node; default `./data/pglite`, parent folders created), `idb://<name>`
 *   (browser IndexedDB), or `memory://` (gone when the process ends; the
 *   default when no Node runtime is present). Pools on the same directory in
 *   one process share one instance; never point two PROCESSES at one data
 *   directory — PGlite does not lock it and they will corrupt each other.
 *   Different directories (and every `memory://` pool) are fully separate
 *   databases.
 * - **Returned types match node-postgres**: `numeric` comes back as a string
 *   (`'12.50'`), `int8`/`bigint` including `COUNT(*)` as a string (set
 *   `int8AsString: false` for PGlite's number/BigInt), `json`/`jsonb` parsed,
 *   `boolean` as boolean, `timestamptz` as `Date`. Known differences: `bytea`
 *   is a `Uint8Array` (pg: `Buffer`), `interval` is a string (pg: an object),
 *   and `date` is midnight UTC (pg: local midnight).
 * - **Errors are Postgres errors** with the same fields as pg's
 *   `DatabaseError` — `code` (`'23505'` unique violation, `'23503'` foreign
 *   key, `'42P01'` missing table), `constraint`, `table`, `detail` — so error
 *   handling written for the postgresql bond works unchanged.
 * - `query(text)` with NO parameters may hold several statements (like
 *   node-postgres) and returns the LAST statement's result; with parameters it
 *   must be one statement.
 * - A transaction's bare `release()` (without commit/rollback) ROLLS BACK
 *   before freeing the connection, so the next caller never inherits an open
 *   transaction.
 * - **Browser use**: every `@molecule/api-*` package — this one and
 *   `@molecule/api-database` included — refuses to load in a plain browser
 *   page (no Node runtime). Run the API in a Node-compatible in-browser
 *   runtime; PGlite itself needs only WebAssembly. Load-time cost: PGlite
 *   starts in about 1–2 s, once per instance.
 * - Same SQL dialect as production, so migrations are plain Postgres `.sql`
 *   files in `migrations/` (no translation layer, unlike the sqlite bond), and
 *   `like` / `ilike` behave exactly as on the postgresql bond.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './defaults.js'
export * from './instances.js'
export * from './migrator.js'
export * from './pool.js'
export * from './queue.js'
export * from './secrets.js'
export * from './store.js'
export * from './types.js'
