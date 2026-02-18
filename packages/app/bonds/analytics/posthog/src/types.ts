/**
 * PostHog app analytics types for molecule.dev.
 *
 * @module
 */

export type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from '@molecule/app-analytics'

/**
 * Options for creating a PostHog provider.
 */
export interface PostHogOptions {
  apiKey?: string
  host?: string
  autocapture?: boolean
}
