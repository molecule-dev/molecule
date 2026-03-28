/**
 * File-based audit provider configuration.
 *
 * @module
 */

/**
 * Configuration options for the file-based audit provider.
 */
export interface FileAuditConfig {
  /** Directory path where audit log files are written. Defaults to `'./audit-logs'`. */
  directory?: string

  /** Maximum size (in bytes) of a single log file before rotation. Defaults to `10_485_760` (10 MB). */
  maxFileSize?: number

  /** Prefix for log file names. Defaults to `'audit'`. */
  filePrefix?: string
}
