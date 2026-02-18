/**
 * PostHog analytics types for molecule.dev.
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
       * PostHog API key.
       */
      POSTHOG_API_KEY?: string
      /**
       * PostHog host URL (defaults to PostHog Cloud).
       */
      POSTHOG_HOST?: string
    }
  }
}

/**
 * Options for creating a PostHog provider.
 */
export interface PostHogOptions {
  apiKey?: string
  host?: string
  flushAt?: number
  flushInterval?: number
}
