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
 *
 * When no API key is provided, this does NOT initialize the SDK (`posthog.init('')`
 * leaves the singleton uninitialized — the SDK logs its own generic error, but
 * every subsequent call is silently dropped): it logs one actionable warning
 * naming VITE_POSTHOG_KEY and returns a no-op provider, so bonding the lazy
 * `provider` export without configuration degrades gracefully.
 *
 * When no `host` is provided, the SDK's own default (PostHog Cloud US,
 * `https://us.i.posthog.com`) applies — EU projects must pass their region host
 * (`https://eu.i.posthog.com`).
 *
 * Calling this a second time with a DIFFERENT config (e.g. Vite HMR re-running
 * a bonds.ts setup function) does NOT re-configure the SDK: `posthog-js`'s
 * `posthog` export is a module-level singleton, so the second `.init()` call
 * is a no-op that keeps the FIRST configuration. This logs one actionable
 * warning naming the ignored call before the SDK's own generic warning fires.
 *
 * @param options - PostHog configuration including `apiKey`, optional `host`, and `autocapture`.
 * @returns An `AnalyticsProvider` backed by the PostHog browser SDK.
 */
export const createProvider = (options?: PostHogOptions): AnalyticsProvider => {
  const apiKey = options?.apiKey ?? ''
  if (!apiKey) {
    // Graceful degradation with a molecule-canonical breadcrumb: the SDK's own
    // "initialized without a token" error never names the env var this stack
    // actually wires (VITE_POSTHOG_KEY), so debugging dead-ends there.
    console.warn(
      '[analytics] PostHog API key not configured — analytics events will NOT be delivered. ' +
        'Pass createProvider({ apiKey }) (canonical source: import.meta.env.VITE_POSTHOG_KEY) ' +
        'or skip bonding the provider entirely.',
    )
    const noop = async (): Promise<void> => {}
    return {
      identify: noop,
      track: noop,
      page: noop,
      group: noop,
      reset: noop,
      flush: noop,
    }
  }

  // posthog-js's `posthog` export is a MODULE-LEVEL singleton: calling
  // `.init()` a second time (e.g. Vite HMR re-running a bonds.ts setup
  // function, or a duplicate createProvider() call) does NOT create a second
  // client — the SDK checks its own `__loaded` flag, logs a generic
  // '[PostHog.js] You have already initialized PostHog! Re-initializing is
  // a no-op' warning, and returns immediately WITHOUT applying the new
  // config. A changed host/autocapture/etc. on the second call is therefore
  // silently discarded — recoverable (the SDK does warn) but the warning
  // never says WHICH options were ignored, so this molecule-canonical
  // warning names the actual failure mode before the SDK's own generic one
  // fires. (`posthog.__loaded` is undefined — falsy — on any stub that
  // doesn't model it, e.g. the mocked SDK in provider.test.ts, so this never
  // fires for the standard single-call test/usage path.)
  if (posthog.__loaded) {
    console.warn(
      "[analytics] PostHog is already initialized — this createProvider() call's " +
        'options (host/autocapture/etc.) will be IGNORED; the FIRST configuration wins. ' +
        'This is expected if Vite HMR re-ran your bond setup; if not, createProvider() ' +
        'is being called more than once with different options.',
    )
  }
  posthog.init(apiKey, {
    // Only override api_host when the caller supplies one — the SDK's own
    // default is the CURRENT PostHog Cloud US endpoint (us.i.posthog.com);
    // hardcoding the legacy app.posthog.com here would re-introduce drift.
    ...(options?.host ? { api_host: options.host } : {}),
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
      // posthog-js supports a client-set timestamp via CaptureOptions — honor
      // the interface's `timestamp` field instead of silently dropping it.
      if (event.timestamp) {
        posthog.capture(event.name, event.properties, { timestamp: event.timestamp })
      } else {
        posthog.capture(event.name, event.properties)
      }
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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
