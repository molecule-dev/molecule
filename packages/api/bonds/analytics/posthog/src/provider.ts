/**
 * PostHog analytics provider implementation for molecule.dev.
 *
 * @see https://www.npmjs.com/package/posthog-node
 *
 * @module
 */

import { PostHog } from 'posthog-node'

import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from '@molecule/api-analytics'

import type { PostHogOptions } from './types.js'

/**
 * Creates a PostHog analytics provider that implements the `AnalyticsProvider`
 * interface. Reads `POSTHOG_API_KEY` and `POSTHOG_HOST` from env if not
 * provided in options.
 *
 * @param options - PostHog-specific configuration (API key, host, flush settings).
 * @returns An `AnalyticsProvider` backed by the PostHog Node SDK.
 */
export const createProvider = (options?: PostHogOptions): AnalyticsProvider => {
  const apiKey = options?.apiKey ?? process.env.POSTHOG_API_KEY ?? ''
  const host = options?.host ?? process.env.POSTHOG_HOST ?? 'https://app.posthog.com'

  const client = new PostHog(apiKey, {
    host,
    flushAt: options?.flushAt ?? 20,
    flushInterval: options?.flushInterval ?? 10000,
  })

  return {
    async identify(user: AnalyticsUserProps): Promise<void> {
      client.identify({
        distinctId: user.userId,
        properties: {
          email: user.email,
          name: user.name,
          ...user.traits,
        },
      })
    },

    async track(event: AnalyticsEvent): Promise<void> {
      client.capture({
        distinctId: event.userId ?? event.anonymousId ?? 'anonymous',
        event: event.name,
        properties: event.properties,
        timestamp: event.timestamp,
      })
    },

    async page(pageView: AnalyticsPageView): Promise<void> {
      client.capture({
        distinctId: 'anonymous',
        event: '$pageview',
        properties: {
          $current_url: pageView.url,
          $pathname: pageView.path,
          $referrer: pageView.referrer,
          page_name: pageView.name,
          page_category: pageView.category,
          ...pageView.properties,
        },
      })
    },

    async group(groupId: string, traits?: Record<string, unknown>): Promise<void> {
      client.groupIdentify({
        groupType: 'company',
        groupKey: groupId,
        properties: traits,
      })
    },

    async reset(): Promise<void> {
      // PostHog Node doesn't have a reset, this is typically client-side
      return Promise.resolve()
    },

    async flush(): Promise<void> {
      await client.flush()
    },
  }
}

/**
 * The default PostHog provider instance.
 */
let _provider: AnalyticsProvider | null = null
let _defaultClient: PostHog | null = null

/**
 * Returns the lazily-initialized default PostHog client instance.
 *
 * @returns The shared `PostHog` client.
 */
function getDefaultClient(): PostHog {
  if (!_defaultClient) {
    const apiKey = process.env.POSTHOG_API_KEY ?? ''
    const host = process.env.POSTHOG_HOST ?? 'https://app.posthog.com'
    _defaultClient = new PostHog(apiKey, {
      host,
      flushAt: 20,
      flushInterval: 10000,
    })
  }
  return _defaultClient
}

/**
 * The provider implementation.
 */
export const provider: AnalyticsProvider = new Proxy({} as AnalyticsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
})

/**
 * Shuts down the default PostHog client, flushing any pending events.
 */
export const shutdown = async (): Promise<void> => {
  await getDefaultClient().shutdown()
}

/**
 * Creates a raw PostHog client instance for direct SDK access.
 *
 * @deprecated Use `createProvider()` instead for the standard analytics interface.
 * @param apiKey - The PostHog project API key (falls back to `POSTHOG_API_KEY` env var).
 * @param host - The PostHog instance URL (falls back to `POSTHOG_HOST` env var).
 * @returns A raw `PostHog` client instance.
 */
export const createClient = (apiKey?: string, host?: string): PostHog => {
  const key = apiKey ?? process.env.POSTHOG_API_KEY ?? ''
  const h = host ?? process.env.POSTHOG_HOST ?? 'https://app.posthog.com'
  return new PostHog(key, { host: h })
}
