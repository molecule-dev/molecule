/**
 * Mixpanel analytics provider for molecule.dev frontend.
 *
 * Uses the `mixpanel-browser` SDK.
 *
 * @module
 */

import mixpanel, { type Config } from 'mixpanel-browser'

import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from '@molecule/app-analytics'
import { snapshotAnalyticsSdkUrls } from '@molecule/app-analytics'

import type { MixpanelOptions } from './types.js'

/** One inert final capture shared by event, person and group transport hooks. */
const scrubSdkPayload = <T>(payload: T): T => snapshotAnalyticsSdkUrls(payload)

type EventHook = NonNullable<Config['hooks']['before_send_events']>
type TrackHook = NonNullable<Config['hooks']['on_track']>
type PeoplePayload = Record<string, unknown>
type PeopleHook = (payload: PeoplePayload) => PeoplePayload | null
type RuntimeHooks = Omit<Config['hooks'], 'before_send_events' | 'on_track'> & {
  before_send_events?: EventHook | EventHook[]
  before_send_people?: PeopleHook | PeopleHook[]
  before_send_groups?: PeopleHook | PeopleHook[]
  on_track?: TrackHook | TrackHook[]
}

/** The SDK accepts ordered hook arrays at runtime; append without duplicating on HMR/re-bonding. */
const appendHook = <H>(configured: H | H[] | undefined, hook: H): H[] => {
  const previous = Array.isArray(configured) ? configured : configured ? [configured] : []
  return [...previous.filter((candidate) => candidate !== hook), hook]
}

const TRACK_HOOK_HISTORY = Symbol('molecule.mixpanelTrackHookHistory')
type ComposedTrackHook = TrackHook & { [TRACK_HOOK_HISTORY]?: TrackHook[] }

/**
 * Preserve the original event name to recognize skip-hooks identify/alias events after app hooks.
 * Ordinary events return their original property object and walk only in before_send_events.
 */
const composeTrackHook = (configured: TrackHook | TrackHook[] | undefined): TrackHook => {
  const configuredHooks = Array.isArray(configured) ? configured : configured ? [configured] : []
  const previous = configuredHooks.flatMap(
    (candidate) => (candidate as ComposedTrackHook)[TRACK_HOOK_HISTORY] ?? [candidate],
  )
  const hook: ComposedTrackHook = (eventName, properties) => {
    let name = eventName
    let currentProperties = properties
    for (const previousHook of previous) {
      const result = previousHook(name, currentProperties)
      if (result === null) return null
      if (typeof result === 'string') name = result
      else if (Array.isArray(result)) {
        if (typeof result[0] === 'string') name = result[0]
        if (result.length > 1) currentProperties = result[1] as typeof properties
      }
    }
    if (eventName !== '$identify' && eventName !== '$create_alias') {
      return [name, currentProperties]
    }
    const captured = scrubSdkPayload({ event: name, properties: currentProperties })
    return [captured.event, captured.properties]
  }
  Object.defineProperty(hook, TRACK_HOOK_HISTORY, { value: previous })
  return hook
}

/**
 * Creates a Mixpanel analytics provider using `mixpanel-browser`. Initializes the SDK
 * with the provided token and returns an `AnalyticsProvider` that maps molecule events to
 * Mixpanel's `track`, `identify`, `people.set`, and `set_group` APIs.
 *
 * When no token is provided, this does NOT initialize the SDK (mixpanel-browser
 * accepts `init('')` in TOTAL silence and then sends every event to
 * api.mixpanel.com with an empty token, where it is dropped server-side with no
 * client-side breadcrumb): it logs one actionable warning naming
 * VITE_MIXPANEL_TOKEN and returns a no-op provider, so bonding the lazy
 * `provider` export without configuration degrades gracefully instead of
 * becoming a silent event black hole.
 *
 * SDK-added location/referrer properties are scrubbed at `before_send_events`,
 * `before_send_people` and `before_send_groups`. Skip-hooks identify/alias tuples are captured
 * at `on_track`; ordinary events walk only at their final event hook. Hooks are composed AFTER
 * init so a pre-initialized singleton keeps its existing hooks and the scrubber always runs last.
 *
 * @param options - Mixpanel configuration including `token` and optional `debug` flag.
 * @returns An `AnalyticsProvider` backed by the Mixpanel browser SDK.
 */
export const createProvider = (options?: MixpanelOptions): AnalyticsProvider => {
  const token = options?.token ?? ''
  if (!token) {
    // Graceful degradation with a breadcrumb: without this warning a missing
    // token means events silently vanish (the SDK never complains), which is
    // indistinguishable from a broken tracking call.
    console.warn(
      '[analytics] Mixpanel token not configured — analytics events will NOT be delivered. ' +
        'Pass createProvider({ token }) (canonical source: import.meta.env.VITE_MIXPANEL_TOKEN) ' +
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

  mixpanel.init(token, {
    debug: options?.debug ?? false,
    track_pageview: false, // We handle page views manually via auto-tracking
  })

  const configuredHooks = mixpanel.get_config('hooks') as RuntimeHooks | undefined
  const hooks: RuntimeHooks = {
    ...configuredHooks,
    before_send_events: appendHook(configuredHooks?.before_send_events, scrubSdkPayload),
    before_send_people: appendHook(configuredHooks?.before_send_people, scrubSdkPayload),
    before_send_groups: appendHook(configuredHooks?.before_send_groups, scrubSdkPayload),
    on_track: composeTrackHook(configuredHooks?.on_track),
  }
  // mixpanel-browser 2.84.0 accepts hook arrays and before_send_people at runtime,
  // although its published Config declaration omits both.
  mixpanel.set_config({ hooks } as unknown as Partial<Config>)

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
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
