/**
 * App-side analytics bond accessor and convenience functions.
 *
 * Bond packages call `setProvider()` during setup. All convenience
 * functions silently swallow errors so analytics never breaks the UI.
 * If no provider is bonded, a no-op provider is used.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { redactCredentials } from '@molecule/app-logger'

import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from './types.js'

const BOND_TYPE = 'app-analytics'

const noopProvider: AnalyticsProvider = {
  identify: async () => {},
  track: async () => {},
  page: async () => {},
  reset: async () => {},
  flush: async () => {},
}

const providerWrappers = new WeakMap<AnalyticsProvider, AnalyticsProvider>()
const wrappedProviders = new WeakSet<AnalyticsProvider>()

/** Redact every payload at retrieval, including a provider bonded directly through app-bond. */
const credentialSafeProvider = (provider: AnalyticsProvider): AnalyticsProvider => {
  if (wrappedProviders.has(provider)) return provider
  const cached = providerWrappers.get(provider)
  if (cached) return cached
  const wrapped: AnalyticsProvider = {
    identify: (user) => provider.identify(redactCredentials(user)),
    track: (event) => provider.track(redactCredentials(event)),
    page: (pageView) => provider.page(redactCredentials(pageView)),
    ...(provider.group
      ? {
          group: (groupId: string, traits?: Record<string, unknown>) =>
            provider.group!(redactCredentials(groupId), redactCredentials(traits)),
        }
      : {}),
    ...(provider.reset ? { reset: () => provider.reset!() } : {}),
    ...(provider.flush ? { flush: () => provider.flush!() } : {}),
  }
  providerWrappers.set(provider, wrapped)
  wrappedProviders.add(wrapped)
  return wrapped
}

/**
 * Registers an analytics provider as the active singleton. Every payload is credential-redacted
 * before the provider can emit it, regardless of which public analytics entrypoint produced it.
 *
 * @param provider - The analytics provider implementation to bond.
 */
export const setProvider = (provider: AnalyticsProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded analytics provider. Returns a no-op provider if
 * none is bonded, so analytics calls never throw.
 *
 * @returns The bonded analytics provider, or a silent no-op fallback.
 */
export const getProvider = (): AnalyticsProvider => {
  if (!isBonded(BOND_TYPE)) {
    return noopProvider
  }
  return credentialSafeProvider(bondGet<AnalyticsProvider>(BOND_TYPE)!)
}

/**
 * Checks whether an analytics provider is currently bonded.
 *
 * @returns `true` if an analytics provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Identifies the current user for analytics tracking. Errors are silently ignored.
 *
 * @param user - The user properties (ID, email, name, traits).
 * @returns A promise that resolves when identification completes or fails silently.
 */
export const identify = (user: AnalyticsUserProps): Promise<void> =>
  getProvider()
    .identify(user)
    .catch(() => {})

/**
 * Tracks a named event with optional properties. Errors are silently ignored.
 *
 * @param event - The event to track (name and optional properties).
 * @returns A promise that resolves when tracking completes or fails silently.
 */
export const track = (event: AnalyticsEvent): Promise<void> =>
  getProvider()
    .track(event)
    .catch(() => {})

/**
 * Tracks a page view event. Errors are silently ignored.
 *
 * @param pageView - The page view data (name, path, referrer, etc.).
 * @returns A promise that resolves when page tracking completes or fails silently.
 */
export const page = (pageView: AnalyticsPageView): Promise<void> =>
  getProvider()
    .page(pageView)
    .catch(() => {})

/**
 * Associates the current user with a group/organization. Errors are silently ignored.
 *
 * @param groupId - The group identifier.
 * @param traits - Optional traits describing the group.
 * @returns A promise that resolves when group association completes or fails silently.
 */
export const group = (groupId: string, traits?: Record<string, unknown>): Promise<void> =>
  (getProvider().group?.(groupId, traits) ?? Promise.resolve()).catch(() => {})

/**
 * Resets the analytics state (e.g. on logout). Errors are silently ignored.
 * @returns A promise that resolves when reset completes or fails silently.
 */
export const reset = (): Promise<void> =>
  (getProvider().reset?.() ?? Promise.resolve()).catch(() => {})

/**
 * Flushes any queued analytics events to the backend. Errors are silently ignored.
 * @returns A promise that resolves when flush completes or fails silently.
 */
export const flush = (): Promise<void> =>
  (getProvider().flush?.() ?? Promise.resolve()).catch(() => {})
