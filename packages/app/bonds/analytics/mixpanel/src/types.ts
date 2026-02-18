/**
 * Mixpanel app analytics types for molecule.dev.
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
 * Options for creating a Mixpanel provider.
 */
export interface MixpanelOptions {
  token?: string
  debug?: boolean
}
