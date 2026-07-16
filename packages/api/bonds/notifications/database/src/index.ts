/**
 * Database-backed notification center provider for molecule.dev.
 *
 * Implements the `@molecule/api-notification-center` interface using the
 * bonded `@molecule/api-database` DataStore for persistence.
 *
 * @remarks
 * - **The tables must already exist — nothing auto-creates them.** Add a
 *   migration for `notifications` (or your `tableName`) with columns:
 *   `id` (uuid/text, PK), `user_id` (text), `type` (text), `title` (text),
 *   `body` (text), `read` (boolean — 0/1 integers fine on SQLite/MySQL),
 *   `data` (text, JSON-serialized, nullable), `channels` (text,
 *   JSON-serialized, nullable), `created_at` (timestamp). Index
 *   `(user_id, read)` and `(user_id, created_at)` for the list/count paths.
 *   And `notification_preferences` (or `preferencesTableName`): `id` (uuid/
 *   text, PK), `user_id` (text, unique), `email`/`push`/`sms` (boolean),
 *   `channels` (text, JSON-serialized).
 * - **Bond the `@molecule/api-database` DataStore first** — every method
 *   calls `getStore()` and throws without it.
 * - `sendBulk()` inserts sequentially (one `create` per entry, no
 *   transaction) — a mid-batch failure leaves earlier rows written.
 * - `getAll()` defaults to `limit: 50`, newest first; drive pagination from
 *   the returned `total`, not `items.length`.
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-notification-center'
 * import { createProvider } from '@molecule/api-notification-center-database'
 *
 * // Bond at startup (requires @molecule/api-database to be bonded)
 * setProvider(createProvider())
 *
 * // Or with custom table names
 * setProvider(createProvider({
 *   tableName: 'user_notifications',
 *   preferencesTableName: 'user_notification_prefs',
 * }))
 * ```
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
