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
    }
  }
}

/**
 * Options for creating a Mixpanel provider.
 */
export interface MixpanelOptions {
  token?: string
  debug?: boolean
}
