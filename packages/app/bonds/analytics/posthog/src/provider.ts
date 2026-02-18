/**
 * PostHog analytics provider for molecule.dev frontend.
 *
 * Uses the `posthog-js` browser SDK.
 *
 * @module
 */

import { posthog } from 'posthog-js'

import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from '@molecule/app-analytics'

import type { PostHogOptions } from './types.js'

/**
 * Creates a PostHog analytics provider using `posthog-js`. Initializes the SDK with the
 * provided API key and host, and returns an `AnalyticsProvider` that maps molecule events to
 * PostHog's `capture`, `identify`, and `group` APIs.
 * @param options - PostHog configuration including `apiKey`, optional `host`, `autocapture`, and `debug` flags.
 * @returns An `AnalyticsProvider` backed by the PostHog browser SDK.
 */
export const createProvider = (options?: PostHogOptions): AnalyticsProvider => {
  const apiKey = options?.apiKey ?? ''
  const host = options?.host ?? 'https://app.posthog.com'

  posthog.init(apiKey, {
    api_host: host,
    autocapture: options?.autocapture ?? false,
    capture_pageview: false, // We handle page views manually via auto-tracking
  })

  return {
    async identify(user: AnalyticsUserProps): Promise<void> {
      posthog.identify(user.userId, {
        email: user.email,
        name: user.name,
        ...user.traits,
      })
    },

    async track(event: AnalyticsEvent): Promise<void> {
      posthog.capture(event.name, event.properties)
    },

    async page(pageView: AnalyticsPageView): Promise<void> {
      posthog.capture('$pageview', {
        $current_url: pageView.url,
        $pathname: pageView.path,
        $referrer: pageView.referrer,
        page_name: pageView.name,
        page_category: pageView.category,
        ...pageView.properties,
      })
    },

    async group(groupId: string, traits?: Record<string, unknown>): Promise<void> {
      posthog.group('company', groupId, traits)
    },

    async reset(): Promise<void> {
      posthog.reset()
    },

    async flush(): Promise<void> {
      // posthog-js doesn't have an explicit flush — events are sent automatically
    },
  }
}

/** Default PostHog provider instance (lazy-initialized via Proxy on first method call). */
let _provider: AnalyticsProvider | null = null
/** Lazy-initialized PostHog analytics provider singleton. */
export const provider: AnalyticsProvider = new Proxy({} as AnalyticsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
