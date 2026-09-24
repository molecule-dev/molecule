/**
 * `@molecule/api-database-d1` — a `@molecule/api-database` provider for
 * **Cloudflare D1**, so a molecule API can run on Workers with no Postgres.
 *
 * D1 *is* SQLite, so this bond reuses `@molecule/api-database-sqlite`'s dialect
 * (query building, placeholder conversion, id generation) verbatim and replaces
 * only the pool: `better-sqlite3` is a synchronous native binding, D1 is an
 * async platform binding. The native driver is never imported, which is what
 * lets this run in a Workers isolate at all.
 *
 * @example
 * ```typescript
 * import { create, findMany, setStore } from '@molecule/api-database'
 * import { createProvider, type D1DatabaseLike } from '@molecule/api-database-d1'
 *
 * // wrangler.toml declares the binding:  [[d1_databases]]  binding = "DB"  database_name = "my-app"
 * interface Env {
 *   DB: D1DatabaseLike
 * }
 *
 * interface Todo {
 *   id: string
 *   title: string
 *   done: number // SQLite has no boolean: 0 / 1
 * }
 *
 * export default {
 *   async fetch(request: Request, env: Env): Promise<Response> {
 *     // Bindings arrive per invocation on `env` — bond the store HERE, not at import time.
 *     setStore(createProvider({ database: env.DB }))
 *
 *     if (request.method === 'POST') {
 *       const { title } = (await request.json()) as { title: string }
 *       const { data } = await create<Todo>('todos', { title, done: 0 }) // id auto-generated
 *       return Response.json(data, { status: 201 })
 *     }
 *
 *     const open = await findMany<Todo>('todos', {
 *       where: [{ field: 'done', operator: '=', value: 0 }],
 *       orderBy: [{ field: 'title', direction: 'asc' }],
 *       limit: 50,
 *     })
 *     return Response.json(open)
 *   },
 * }
 * ```
 *
 * @remarks
 * - **Use `setStore(...)`, not `setPool(...)` / `bond('database', ...)`.** `createProvider()`
 *   returns a `DataStore` (the CRUD API: `findMany`, `create`, `updateById` and the rest). For raw SQL
 *   use `createDatabasePool({ database: env.DB })` with the core's `setPool()`.
 * - **The table must already exist** — apply it with `wrangler d1 migrations apply` (see below);
 *   `create()` fills in a uuid `id` only when the table has an `id` column and you omit it. It
 *   uses `node:crypto`'s `randomUUID`, so the Worker needs the `nodejs_compat` compatibility flag.
 * - **The binding must be PASSED IN; it cannot be discovered.** A Worker's
 *   bindings arrive per-invocation on `env` — they are not in the module scope
 *   and not in `process.env`. So `setupBonds()` takes `env` on Workers, and the
 *   provider is constructed per invocation rather than once at import time.
 * - **There are no interactive transactions, and this bond does not fake one.**
 *   `pool.transaction` is `undefined` rather than a no-op that reports success
 *   for a rollback which never happened. D1 offers `batch()` — one atomic set of
 *   statements decided up front — which is a different shape, not a drop-in.
 *   Check `typeof pool.transaction === 'function'` before relying on it.
 * - **Migrations do not run through this bond.** `@molecule/api-database-sqlite`'s
 *   migrator reads the filesystem and opens the native driver, neither of which
 *   exists on Workers. Apply schema with `wrangler d1 migrations apply` from CI
 *   or a local shell, the same way you would run any other out-of-band migration.
 * - **D1 rows come back as plain JSON values.** There is no per-column type
 *   metadata the way `better-sqlite3` exposes it, so a column's declared type
 *   cannot be used to re-hydrate values; store dates as ISO strings and booleans
 *   as 0/1, which is what the shared SQLite dialect already writes.
 *
 * @module
 */

export * from './pool.js'
export * from './provider.js'
export * from './types.js'
