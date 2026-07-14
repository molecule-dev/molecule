/**
 * Database core interface for molecule.dev.
 *
 * Defines the standard interface for database providers, including both
 * raw connection pools and the database-agnostic DataStore abstraction.
 *
 * @example
 * ```typescript
 * import { setStore, findById, findMany, create, updateById, deleteById } from '@molecule/api-database'
 * import { store } from '@molecule/api-database-postgresql'
 *
 * // Wire the DataStore at app startup
 * setStore(store)
 *
 * // CRUD operations — database-agnostic
 * const user = await findById<User>('users', userId)
 *
 * const activeUsers = await findMany<User>('users', {
 *   where: [
 *     { field: 'status', operator: '=', value: 'active' },
 *   ],
 *   orderBy: [{ field: 'createdAt', direction: 'desc' }],
 *   limit: 50,
 * })
 *
 * await create('users', { id, username, email })
 * await updateById('users', id, { name: 'New Name' })
 * await deleteById('users', id)
 * ```
 *
 * @remarks
 * Data-access contract — the rules code generators most often get wrong:
 *
 * - **Scope EVERY query by owner — the #1 security rule.** A user must never read or write
 *   another user's rows. Add `{ field: 'user_id', operator: '=', value: getUserId(res) }` to
 *   every list/read `where`, and for a single-row route load the row and 404 if it isn't the
 *   caller's (404, not 403 — don't leak existence). An unscoped `findById`/`updateById`/
 *   `deleteById` on a client-supplied id is an IDOR (one user edits another's data). See the
 *   `auth` skill.
 * - **CRUD goes through the exported data functions** (`findById`, `findOne`,
 *   `findMany`, `count`, `create`, `updateById`, `deleteById`). Filter with a
 *   `where` ARRAY of `{ field, operator, value }`:
 *   `findMany('plants', { where: [{ field: 'speciesId', operator: '=', value: id }], limit: 50 })`.
 *   A bare key object — `findMany('plants', { speciesId: id })` — is NOT a valid
 *   `FindManyOptions` and will not filter.
 * - **Raw SQL: import the standalone `query(sql, values)` from this package** —
 *   NOT `getStore().query()`. The DataStore has no `query`; raw parameterized
 *   query lives on the pool/provider. The store also has NO `.exec()`,
 *   `.prepare()`, `.run()`, `.get()`, or `.all()` — those are driver methods
 *   (better-sqlite3 / pg) and calling them fails the type-check.
 * - **Create tables only via timestamped `.sql` files in `migrations/`** (the
 *   migration runner applies them on startup) — NEVER programmatically through
 *   the store. Seed rows with `create()`.
 * - **Every `id` is a UUID string** (the resource layer sets `id = id || uuid()`
 *   on create). So every primary key AND foreign key is a UUID-string column:
 *   `id TEXT PRIMARY KEY` (SQLite) / `id UUID PRIMARY KEY` (Postgres); FKs
 *   likewise (`user_id TEXT` / `user_id UUID`). NEVER `INTEGER PRIMARY KEY
 *   AUTOINCREMENT` or `SERIAL` — inserting a UUID string into an integer key
 *   fails at runtime (`datatype mismatch`) and breaks every create endpoint.
 * - **`like` vs `ilike` — pick by who controls the wildcards.** Both are
 *   case-insensitive on every bond (identical results across postgresql/
 *   mysql/sqlite — see the `WhereCondition['operator']` JSDoc for exactly how
 *   each bond gets there). `like` passes `value` through as a raw SQL
 *   pattern — YOU write the `%`/`_`; use it when you already built the
 *   pattern (e.g. a fixed prefix search `'admin_%'`). `ilike` treats `value`
 *   as a literal substring, escapes it, and wraps `%…%` for you — use it for
 *   ANY human-typed search box (`{ operator: 'ilike', value: userInput }`),
 *   never `like` with a caller-built `%${userInput}%` string.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports (raw query access)
export * from './provider.js'

// DataStore exports (abstract CRUD)
export * from './store.js'
export * from './store-provider.js'
