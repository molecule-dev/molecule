/**
 * Type definitions for the Mixpanel analytics provider.
 *
 * @module
 */

export type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from '@molecule/api-analytics'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * Mixpanel project token.
       */
      MIXPANEL_TOKEN?: string
      /**
       * Mixpanel group KEY that `group()` associates users under. Defaults to
       * `'company'`. Set to `'workspace'`, `'team'`, etc. to group by a
       * different entity — the key must match a group key configured in
       * Mixpanel → Project Settings.
       */
      MIXPANEL_GROUP_TYPE?: string
    }
  }
}

/**
 * Options for creating a Mixpanel provider.
 */
export interface MixpanelOptions {
  /** Mixpanel project token (falls back to the MIXPANEL_TOKEN env var). */
  token?: string
  /** Enable the SDK's debug logging. */
  debug?: boolean
  /**
   * Mixpanel ingestion host, optionally with a `:port` suffix. Required for
   * EU/India data residency (e.g. `'api-eu.mixpanel.com'`,
   * `'api-in.mixpanel.com'`) — the default is the US cluster
   * (`api.mixpanel.com`).
   */
  host?: string
  /** Wire protocol for the ingestion host (self-hosted proxies). Defaults to `'https'`. */
  protocol?: 'http' | 'https'
  /**
   * Group KEY that `group()` associates users under (Mixpanel's "group key" —
   * the group-analytics dimension). Falls back to the `MIXPANEL_GROUP_TYPE`
   * env var, then `'company'`. Set to `'workspace'`, `'team'`, etc. to group
   * by a different entity; the key must match a group key configured in
   * Mixpanel → Project Settings.
   */
  groupType?: string
}
