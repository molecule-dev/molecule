/**
 * Mixpanel analytics provider implementation.
 *
 * @module
 */

import Mixpanel from 'mixpanel'

import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from '@molecule/api-analytics'

import type { MixpanelOptions } from './types.js'

/**
 * Create a Mixpanel analytics provider. Uses the token from options or the
 * MIXPANEL_TOKEN environment variable.
 * @param options - Mixpanel configuration (token, API host, debug mode).
 * @returns An AnalyticsProvider that tracks events via Mixpanel.
 */
export const createProvider = (options?: MixpanelOptions): AnalyticsProvider => {
  const token = options?.token ?? process.env.MIXPANEL_TOKEN ?? ''
  const mixpanel = Mixpanel.init(token, {
    debug: options?.debug ?? false,
  })

  return {
    async identify(user: AnalyticsUserProps): Promise<void> {
      return new Promise((resolve, reject) => {
        mixpanel.people.set(
          user.userId,
          {
            $email: user.email,
            $name: user.name,
            ...user.traits,
          },
          (err) => {
            if (err) reject(err)
            else resolve()
          },
        )
      })
    },

    async track(event: AnalyticsEvent): Promise<void> {
      return new Promise((resolve, reject) => {
        mixpanel.track(
          event.name,
          {
            distinct_id: event.userId ?? event.anonymousId,
            time: event.timestamp ? Math.floor(event.timestamp.getTime() / 1000) : undefined,
            ...event.properties,
          },
          (err) => {
            if (err) reject(err)
            else resolve()
          },
        )
      })
    },

    async page(pageView: AnalyticsPageView): Promise<void> {
      return new Promise((resolve, reject) => {
        mixpanel.track(
          'Page View',
          {
            page_name: pageView.name,
            page_category: pageView.category,
            page_url: pageView.url,
            page_path: pageView.path,
            page_referrer: pageView.referrer,
            ...pageView.properties,
          },
          (err) => {
            if (err) reject(err)
            else resolve()
          },
        )
      })
    },

    async group(groupId: string, traits?: Record<string, unknown>): Promise<void> {
      return new Promise((resolve, reject) => {
        mixpanel.groups.set('company', groupId, traits ?? {}, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    },

    async flush(): Promise<void> {
      // Mixpanel doesn't have an explicit flush, events are sent immediately
      return Promise.resolve()
    },
  }
}

/**
 * The default Mixpanel provider instance.
 */
let _provider: AnalyticsProvider | null = null
/**
 * The provider implementation.
 */
export const provider: AnalyticsProvider = new Proxy({} as AnalyticsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})
