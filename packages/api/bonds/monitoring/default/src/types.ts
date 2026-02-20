/**
 * Type definitions for the default in-process monitoring provider.
 * @module
 */

/**
 * Configuration options for the default monitoring provider.
 */
export interface DefaultMonitoringOptions {
  /**
   * Timeout in milliseconds for each individual check before it is
   * considered 'down'. Defaults to 10000.
   */
  checkTimeoutMs?: number
}
