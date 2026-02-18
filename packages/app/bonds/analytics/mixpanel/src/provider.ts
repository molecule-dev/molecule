/**
 * Mixpanel analytics provider for molecule.dev frontend.
 *
 * Uses the `mixpanel-browser` SDK.
 *
 * @module
 */

import mixpanel from 'mixpanel-browser'

import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from '@molecule/app-analytics'

import type { MixpanelOptions } from './types.js'

/**
 * Creates a Mixpanel analytics provider using `mixpanel-browser`. Initializes the SDK
 * with the provided token and returns an `AnalyticsProvider` that maps molecule events to
 * Mixpanel's `track`, `identify`, `people.set`, and `set_group` APIs.
 * @param options - Mixpanel configuration including `token` and optional `debug` flag.
 * @returns An `AnalyticsProvider` backed by the Mixpanel browser SDK.
 */
export const createProvider = (options?: MixpanelOptions): AnalyticsProvider => {
  const token = options?.token ?? ''

  mixpanel.init(token, {
    debug: options?.debug ?? false,
    track_pageview: false, // We handle page views manually via auto-tracking
  })

  return {
    async identify(user: AnalyticsUserProps): Promise<void> {
      mixpanel.identify(user.userId)
      mixpanel.people.set({
        $email: user.email,
        $name: user.name,
        ...user.traits,
      })
    },

    async track(event: AnalyticsEvent): Promise<void> {
      mixpanel.track(event.name, event.properties)
    },

    async page(pageView: AnalyticsPageView): Promise<void> {
      mixpanel.track('Page View', {
        page_name: pageView.name,
        page_category: pageView.category,
        page_url: pageView.url,
        page_path: pageView.path,
        page_referrer: pageView.referrer,
        ...pageView.properties,
      })
    },

    async group(groupId: string, traits?: Record<string, unknown>): Promise<void> {
      mixpanel.set_group('company', groupId)
      if (traits) {
        mixpanel.get_group('company', groupId).set(traits)
      }
    },

    async reset(): Promise<void> {
      mixpanel.reset()
    },

    async flush(): Promise<void> {
      // mixpanel-browser sends events immediately, no explicit flush needed
    },
  }
}

/** Default Mixpanel provider instance (lazy-initialized via Proxy on first method call). */
let _provider: AnalyticsProvider | null = null
/** Lazy-initialized Mixpanel analytics provider singleton. */
export const provider: AnalyticsProvider = new Proxy({} as AnalyticsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
