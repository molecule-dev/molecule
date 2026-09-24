/**
 * MySQL database provider for molecule.dev.
 *
 * @see https://www.npmjs.com/package/mysql2
 *
 * @example
 * ```typescript
 * import { create, findMany, setPool, setStore, updateById } from '@molecule/api-database'
 * import { pool, store } from '@molecule/api-database-mysql'
 *
 * // Startup: bond once. The connection comes from MYSQL_URL (read lazily on first query).
 * setPool(pool) // raw query() + transactions
 * setStore(store) // the CRUD API app code uses
 *
 * interface Post {
 *   id: string
 *   title: string
 *   status: 'draft' | 'published'
 * }
 *
 * // The `posts` table comes from a migration; create() generates a uuid `id` when omitted.
 * const { data: draft } = await create<Post>('posts', { title: 'Hello MySQL', status: 'draft' })
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
 *   `@molecule/api-database` — not `bond('database-mysql', ...)`. App code then calls the core's
 *   `findMany`/`create`/`updateById`, never `mysql2` directly.
 * - **Tables come from `.sql` migrations**, applied by `createMigrator(migrationsDir)()` (it
 *   creates the database if missing, runs files in lexical order with `ANSI_QUOTES`), never by
 *   `CREATE TABLE` at request time.
 * - **MySQL has no `RETURNING`**: `create`/`updateById` re-read the row by `id`, so a table
 *   without an `id` column gets `data: null` back even though the write succeeded.
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
