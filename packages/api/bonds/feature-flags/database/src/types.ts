/**
 * Database-backed feature flags provider configuration.
 *
 * @module
 */

/**
 * Configuration options for the database-backed feature flags provider.
 */
export interface DatabaseFlagConfig {
  /**
   * The database table name for storing feature flags.
   *
   * @default 'feature_flags'
   */
  tableName?: string
}
