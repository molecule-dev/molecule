/**
 * Safe analytics accessor for provider bonds.
 *
 * Returns the bonded analytics provider if available, otherwise falls back to no-op.
 * This allows provider bonds to track events without hard-depending on `@molecule/api-analytics`.
 *
 * @module
 */

import { get } from './bond.js'

interface MinimalAnalytics {
  identify(user: {
    userId: string
    email?: string
    name?: string
    traits?: Record<string, unknown>
  }): Promise<void>
  track(event: {
    name: string
    properties?: Record<string, unknown>
    userId?: string
    anonymousId?: string
  }): Promise<void>
  page(pageView: {
    name?: string
    category?: string
    url?: string
    path?: string
    properties?: Record<string, unknown>
  }): Promise<void>
}

const noopAnalytics: MinimalAnalytics = {
  identify: async () => {},
  track: async () => {},
  page: async () => {},
}

/**
 * Get the bonded analytics provider, falling back to no-op.
 *
 * Returns a lazy proxy that resolves the bonded analytics on each call,
 * so it's safe to call at module scope (`const analytics = getAnalytics()`).
 * If an analytics provider is bonded later, the proxy will pick it up automatically.
 *
 * Safe to call even if `@molecule/api-analytics` isn't installed.
 * Provider bonds and resource handlers should use this instead of importing
 * from `@molecule/api-analytics` directly.
 *
 * @example
 * ```typescript
 * import { getAnalytics } from '`@molecule/api-bond`'
 *
 * const analytics = getAnalytics()
 * await analytics.track({ name: 'user.login', userId: '123' })
 * ```
 * @returns An analytics object whose methods delegate to the bonded analytics provider or no-op.
 */
export function getAnalytics(): MinimalAnalytics {
  return {
    identify: async (user) => (get<MinimalAnalytics>('analytics') ?? noopAnalytics).identify(user),
    track: async (event) => (get<MinimalAnalytics>('analytics') ?? noopAnalytics).track(event),
    page: async (pageView) => (get<MinimalAnalytics>('analytics') ?? noopAnalytics).page(pageView),
  }
}
