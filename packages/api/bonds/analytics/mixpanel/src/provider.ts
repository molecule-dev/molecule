/**
 * Mixpanel analytics provider implementation.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'
import Mixpanel from 'mixpanel'

import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from '@molecule/api-analytics'
import { configNotConfiguredError } from '@molecule/api-secrets'

import type { MixpanelOptions } from './types.js'

/**
 * Create a Mixpanel analytics provider. Uses the token from options or the
 * MIXPANEL_TOKEN environment variable.
 *
 * When no token is configured, this does NOT throw (bonding at boot stays
 * safe — the raw `Mixpanel.init('')` throws an opaque "needs a Mixpanel
 * token" error): it logs one actionable warning naming MIXPANEL_TOKEN and
 * returns a no-op provider. Analytics is fire-and-forget telemetry — callers
 * (`void track(...)` sites don't catch) must never crash or see 503s because
 * an optional analytics key is unset.
 *
 * @param options - Mixpanel configuration (token, debug mode, ingestion host/protocol).
 * @returns An AnalyticsProvider that tracks events via Mixpanel.
 */
export const createProvider = (options?: MixpanelOptions): AnalyticsProvider => {
  const token = options?.token ?? process.env.MIXPANEL_TOKEN ?? ''
  if (!token) {
    // Graceful degradation with a breadcrumb: the warning carries the
    // registered secret's description + setup URL, so "events never appear in
    // Mixpanel" is diagnosable from the boot log instead of total silence.
    console.warn(`[analytics] ${configNotConfiguredError('MIXPANEL_TOKEN', 'analytics').message}`)
    const noop = async (): Promise<void> => {}
    return {
      identify: noop,
      track: noop,
      page: noop,
      group: noop,
      flush: noop,
    }
  }
  const mixpanel = Mixpanel.init(token, {
    debug: options?.debug ?? false,
    ...(options?.host ? { host: options.host } : {}),
    ...(options?.protocol ? { protocol: options.protocol } : {}),
  })
  // Group key is configurable (default 'company') so an app can group users
  // under 'workspace'/'team'/etc. instead of the hardcoded default.
  const groupType = options?.groupType ?? process.env.MIXPANEL_GROUP_TYPE ?? 'company'

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
            // Deliberately seconds, NOT the pinned `mixpanel` SDK's own
            // millisecond convention (its `ensure_timestamp` passes numbers
            // through unchanged and only converts a `Date` to ms). Mixpanel's
            // ingestion API auto-detects the unit by magnitude, so both work
            // — this only costs sub-second precision. Left as-is: switching
            // to `event.timestamp` (ms) has no user-visible benefit and isn't
            // worth the churn. Do not "fix" this without also confirming
            // ingestion still auto-detects the new magnitude correctly.
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
            // Server-side has no ambient session — attribute the page view
            // when the caller supplies an identity (undefined is dropped
            // during serialization, preserving the previous wire format).
            distinct_id: pageView.userId ?? pageView.anonymousId,
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
        mixpanel.groups.set(groupType, groupId, traits ?? {}, (err) => {
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
