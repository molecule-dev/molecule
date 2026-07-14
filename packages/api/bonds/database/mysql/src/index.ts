/**
 * MySQL database provider for molecule.dev.
 *
 * @see https://www.npmjs.com/package/mysql2
 *
 * @remarks
 * - **Connection config is required, one way or another.** Set `MYSQL_URL`, OR the
 *   discrete `MYSQL_HOST`/`MYSQL_PORT`/`MYSQL_DATABASE`/`MYSQL_USER`/`MYSQL_PASSWORD`
 *   vars, OR pass an explicit config object to `createPool()`. With NONE of those,
 *   `createPool()` now throws an actionable "MYSQL_URL is not set" error at first use
 *   instead of silently connecting as `root@localhost` with no password and failing
 *   later with a raw `ECONNREFUSED`/`ER_ACCESS_DENIED`.
 * - **`pool.stats` is `undefined`** — mysql2 exposes no public stats API. Call it as
 *   `pool.stats?.()` (the `DatabasePool` interface already marks it optional); a
 *   fabricated `{ total: 0, idle: 0, waiting: 0 }` would read as "pool down" to a
 *   health page even on a perfectly healthy connection. Only the postgresql bond
 *   returns real counts.
 * - **`like` is case-insensitive and does NOT escape the value** — the caller's own
 *   `%`/`_` are honored as wildcards, identical to the postgresql/sqlite bonds. For
 *   human-typed search input, use `ilike` instead (escapes + auto-wraps `%…%`) — see
 *   `WhereCondition['operator']` in `@molecule/api-database`.
 * - **A migration file with a genuine error** (not an idempotent "already exists")
 *   now FAILS the boot with every broken file named, instead of warn-logging and
 *   booting with a partial schema.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './migrator.js'
export * from './provider.js'
export * from './secrets.js'
export * from './store.js'
export * from './types.js'
