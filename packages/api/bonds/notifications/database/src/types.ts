/**
 * Database notification center provider configuration types.
 *
 * @module
 */

/**
 * Configuration for the database-backed notification center provider.
 */
export interface DatabaseNotificationCenterConfig {
  /** Table name for notifications. Defaults to `'notifications'`. */
  tableName?: string

  /** Table name for notification preferences. Defaults to `'notification_preferences'`. */
  preferencesTableName?: string
}
