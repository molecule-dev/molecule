/**
 * Analytics provider management and convenience functions.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  AnalyticsEvent,
  AnalyticsPageView,
  AnalyticsProvider,
  AnalyticsUserProps,
} from './types.js'

const BOND_TYPE = 'analytics'

/**
 * Registers an analytics provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-analytics'
 * import { provider as mixpanel } from '@molecule/api-analytics-mixpanel'
 *
 * setProvider(mixpanel)
 * ```
 *
 * @param provider - The analytics provider implementation to bond.
 */
export const setProvider = (provider: AnalyticsProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded analytics provider, throwing if none is configured.
 *
 * @returns The bonded analytics provider.
 * @throws {Error} If no analytics provider has been bonded.
 */
export const getProvider = (): AnalyticsProvider => {
  try {
    return bondRequire<AnalyticsProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('analytics.error.noProvider', undefined, {
        defaultValue: 'Analytics provider not configured. Call setProvider() first.',
      }),
    )
  }
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
 * Identifies a user by associating their ID with profile traits (email, name, etc.)
 * in the analytics platform. Delegates to the bonded provider's `identify()`.
 *
 * @param user - The user properties including `userId` and optional traits.
 * @returns A promise that resolves when the user has been identified.
 * @throws {Error} If no analytics provider has been bonded.
 */
export const identify = async (user: AnalyticsUserProps): Promise<void> => {
  return getProvider().identify(user)
}

/**
 * Tracks a named event with optional properties, user ID, and timestamp.
 * Delegates to the bonded provider's `track()`.
 *
 * @param event - The event to track, including `name` and optional `properties`.
 * @returns A promise that resolves when the event has been tracked.
 * @throws {Error} If no analytics provider has been bonded.
 */
export const track = async (event: AnalyticsEvent): Promise<void> => {
  return getProvider().track(event)
}

/**
 * Records a page view with optional name, category, URL, and path.
 * Delegates to the bonded provider's `page()`.
 *
 * @param pageView - The page view data including optional `name`, `url`, and `path`.
 * @returns A promise that resolves when the page view has been recorded.
 * @throws {Error} If no analytics provider has been bonded.
 */
export const page = async (pageView: AnalyticsPageView): Promise<void> => {
  return getProvider().page(pageView)
}

/**
 * Associates the current user with a group or organization, with optional
 * traits describing the group. Not all providers support this.
 *
 * @param groupId - The unique identifier of the group/organization.
 * @param traits - Optional key-value traits describing the group (e.g. `{ plan: 'enterprise' }`).
 * @returns A promise that resolves when the group association has been recorded.
 * @throws {Error} If no provider is bonded or the provider doesn't support `group()`.
 */
export const group = async (groupId: string, traits?: Record<string, unknown>): Promise<void> => {
  const provider = getProvider()
  if (!provider.group) {
    throw new Error(
      t('analytics.error.noGroupSupport', undefined, {
        defaultValue: 'Analytics provider does not support group().',
      }),
    )
  }
  return provider.group(groupId, traits)
}

/**
 * Resets the analytics state, clearing the identified user. Typically called
 * on logout. No-op if the provider doesn't implement `reset()`.
 * @returns A promise that resolves when the analytics state has been reset.
 */
export const reset = async (): Promise<void> => {
  const provider = getProvider()
  if (provider.reset) {
    return provider.reset()
  }
}

/**
 * Flushes any queued analytics events, sending them immediately to the provider's
 * backend. No-op if the provider doesn't implement `flush()` or sends events
 * immediately.
 * @returns A promise that resolves when all queued events have been flushed.
 */
export const flush = async (): Promise<void> => {
  const provider = getProvider()
  if (provider.flush) {
    return provider.flush()
  }
}
