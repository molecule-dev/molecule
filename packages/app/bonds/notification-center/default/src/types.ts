/**
 * Default notification center provider configuration types.
 *
 * @module
 */

/**
 * Provider-specific configuration for the default notification center provider.
 */
export interface DefaultNotificationCenterConfig {
  /**
   * Default number of notifications to fetch per page.
   * Defaults to `20`.
   */
  defaultPageSize?: number

  /**
   * Whether to automatically refresh the unread count when polling.
   * Defaults to `true`.
   */
  refreshUnreadOnPoll?: boolean
}
