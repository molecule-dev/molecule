/**
 * PostHog analytics provider implementation for molecule.dev.
 *
 * @see https://www.npmjs.com/package/posthog-node
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'
import { PostHog } from 'posthog-node'

import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from '@molecule/api-analytics'
import { configNotConfiguredError } from '@molecule/api-secrets'

import type { PostHogOptions } from './types.js'

/**
 * Logs one actionable warning when the PostHog API key is missing. The SDK
 * "gracefully" disables itself, but its own "client will be disabled" error is
 * debug-gated — with default options a missing key means TOTAL silence: every
 * call resolves, nothing is ever sent, and there is no breadcrumb to find.
 */
const warnIfMissingKey = (apiKey: string): void => {
  if (!apiKey) {
    console.warn(`[analytics] ${configNotConfiguredError('POSTHOG_API_KEY', 'analytics').message}`)
  }
}

/**
 * Builds an `AnalyticsProvider` around an existing PostHog client instance.
 * Internal: shared by `createProvider()` (own client) and the lazy default
 * `provider` (the shared default client, so `shutdown()` flushes it).
 *
 * @param client - The PostHog Node SDK client to wrap.
 * @param groupType - The group TYPE `group()` associates users under (default `'company'`).
 * @returns An `AnalyticsProvider` backed by the given client.
 */
const buildProvider = (client: PostHog, groupType = 'company'): AnalyticsProvider => {
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
        // Server-side has no ambient session: without a caller-supplied
        // identity every page view collapses into one shared PostHog person.
        distinctId: pageView.userId ?? pageView.anonymousId ?? 'anonymous',
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
        groupType,
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
 * Creates a PostHog analytics provider that implements the `AnalyticsProvider`
 * interface. Reads `POSTHOG_API_KEY` and `POSTHOG_HOST` from env if not
 * provided in options. When neither is set, the SDK's own default host
 * (PostHog Cloud US, `https://us.i.posthog.com`) applies — EU projects must
 * set `POSTHOG_HOST=https://eu.i.posthog.com`.
 *
 * The returned provider owns its own PostHog client — the module-level
 * `shutdown()` does NOT flush it; call the provider's `flush()` before the
 * process exits. (The lazy default `provider` export shares the default
 * client, which `shutdown()` does flush.)
 *
 * @param options - PostHog-specific configuration (API key, host, flush settings).
 * @returns An `AnalyticsProvider` backed by the PostHog Node SDK.
 */
export const createProvider = (options?: PostHogOptions): AnalyticsProvider => {
  const apiKey = options?.apiKey ?? process.env.POSTHOG_API_KEY ?? ''
  // Leave `host` undefined when unconfigured: posthog-node then uses its own
  // CURRENT default (us.i.posthog.com). Hardcoding the legacy app.posthog.com
  // here overrode the pinned SDK's default with a deprecated endpoint.
  const host = options?.host ?? process.env.POSTHOG_HOST

  warnIfMissingKey(apiKey)
  const client = new PostHog(apiKey, {
    host,
    flushAt: options?.flushAt ?? 20,
    flushInterval: options?.flushInterval ?? 10000,
  })

  // Group type is configurable (default 'company') so an app can group users
  // under 'workspace'/'team'/etc. instead of the hardcoded default.
  const groupType = options?.groupType ?? process.env.POSTHOG_GROUP_TYPE
  return buildProvider(client, groupType)
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
    // undefined → the SDK's own default host (us.i.posthog.com) applies.
    const host = process.env.POSTHOG_HOST
    warnIfMissingKey(apiKey)
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
 *
 * Wraps the SHARED default client (the same one `shutdown()` flushes). It
 * previously created a second, private client — events queued through this
 * provider were then silently dropped at process exit because `shutdown()`
 * flushed the other, empty client.
 */
export const provider: AnalyticsProvider = new Proxy({} as AnalyticsProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = buildProvider(getDefaultClient(), process.env.POSTHOG_GROUP_TYPE)
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = buildProvider(getDefaultClient(), process.env.POSTHOG_GROUP_TYPE)
    return Reflect.set(_provider, prop, value)
  },
})

/**
 * Shuts down the default PostHog client (the one behind the lazy `provider`
 * export), flushing any pending events. PostHog batches events (`flushAt`,
 * default 20 / `flushInterval`, default 10s) — call this before the process
 * exits or short-lived processes silently lose queued events.
 *
 * Providers created via `createProvider()` own their own client — use their
 * `flush()` instead.
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
  // undefined → the SDK's own default host (us.i.posthog.com) applies.
  const h = host ?? process.env.POSTHOG_HOST
  return new PostHog(key, { host: h })
}
