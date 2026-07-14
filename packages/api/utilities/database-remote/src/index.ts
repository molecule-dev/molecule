/**
 * `@molecule/api-database-remote` — connect to USER-supplied databases
 * (Postgres / MySQL / SQLite) for inspection, schema browsing, and ad-hoc
 * query execution.
 *
 * This is **distinct** from `@molecule/api-database` (the app's own
 * abstract DataStore). That package is the singleton bond category for the
 * application's primary persistence; this package is a separate driver
 * pool keyed by a user-supplied connection string, intended for the
 * `database-admin` flagship app and similar features where end-users
 * register external databases to browse.
 *
 * Why the split:
 * - The app's DataStore is wired once at startup with a single fixed
 *   connection. A user-facing database explorer must support N parallel
 *   connections, each opened lazily, each with its own readonly /
 *   timeout / pool-size policy.
 * - The DataStore exposes high-level CRUD (`findOne`, `findMany`, …);
 *   this utility exposes the low-level surface a UI needs
 *   (`listSchemas`, `listTables`, `describeTable`, raw `runQuery`).
 *
 * Security:
 * - `runQuery(sql, params)` requires parameterized SQL — never interpolate
 *   user input into the SQL string.
 * - `readonly: true` adds a defence-in-depth keyword sniff (rejects
 *   `INSERT` / `UPDATE` / `DELETE` / DDL). Production deployments should
 *   ALSO connect with a read-only DB role.
 * - Per-query `timeoutMs` and `maxRows` caps protect against runaway
 *   queries; defaults are 30s / 1000 rows.
 *
 * Drivers (`pg`, `mysql2`, `better-sqlite3`) are declared as **optional**
 * peer dependencies and lazy-loaded — only install the engines you need.
 *
 * Locale bonds are intentionally not used — error messages on the thrown
 * {@link RemoteDbError} are developer-facing English (handler-error
 * pattern). Map `error.code` to translated user-facing strings in the
 * calling handler.
 *
 * @example
 * ```ts
 * import { connectRemote } from '@molecule/api-database-remote'
 *
 * const db = await connectRemote({
 *   url: 'postgresql://reader:secret@db.example.com/analytics',
 *   type: 'postgresql',
 *   readonly: true,
 * })
 *
 * const schemas = await db.listSchemas()
 * const tables = await db.listTables('public')
 * const schema = await db.describeTable('public', 'users')
 *
 * const result = await db.runQuery(
 *   'SELECT * FROM users WHERE created_at > $1',
 *   [new Date('2024-01-01')],
 *   { timeoutMs: 5_000, maxRows: 100 },
 * )
 *
 * await db.disconnect()
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './connect.js'
export * from './driverTypes.js'
export * from './keywords.js'
export * from './mysql-client.js'
export * from './pg-client.js'
export * from './sqlite-client.js'
export * from './types.js'
