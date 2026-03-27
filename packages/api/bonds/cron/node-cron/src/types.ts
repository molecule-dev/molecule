/**
 * node-cron provider configuration types.
 *
 * @module
 */

/**
 * Configuration options for the node-cron provider.
 */
export interface NodeCronConfig {
  /** Default IANA timezone for all jobs (e.g., `'America/New_York'`). */
  timezone?: string
}
