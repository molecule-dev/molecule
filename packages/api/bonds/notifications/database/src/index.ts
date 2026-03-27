/**
 * Database-backed notification center provider for molecule.dev.
 *
 * Implements the `@molecule/api-notification-center` interface using the
 * bonded `@molecule/api-database` DataStore for persistence.
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

export * from './provider.js'
export * from './types.js'
