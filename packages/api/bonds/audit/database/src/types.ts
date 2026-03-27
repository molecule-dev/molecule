/**
 * Database audit provider configuration.
 *
 * @module
 */

/**
 * Configuration options for the database-backed audit provider.
 */
export interface DatabaseAuditConfig {
  /** Name of the database table used to store audit records. Defaults to `'audit_log'`. */
  tableName?: string
}
