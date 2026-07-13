/**
 * Provider-agnostic analytics interface for molecule.dev.
 *
 * Defines the `AnalyticsProvider` interface for tracking events, identifying users,
 * and recording page views. Bond packages (Mixpanel, PostHog, Segment, etc.)
 * implement this interface. Application code uses the convenience functions
 * (`track`, `identify`, `page`) which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, track, identify } from '@molecule/api-analytics'
 * import { provider as mixpanel } from '@molecule/api-analytics-mixpanel'
 *
 * setProvider(mixpanel)
 * await identify({ userId: 'u_123', email: 'user@example.com' })
 * await track({ name: 'purchase.completed', properties: { amount: 49.99 } })
 * ```
 *
 * @remarks
 * Unlike the app-side `@molecule/app-analytics` (which swallows every error so
 * analytics can never break the UI), these server-side convenience functions
 * PROPAGATE provider failures: `track()`/`identify()`/`page()` reject when the
 * provider does, and all of them throw when no provider is bonded. Add
 * `.catch()` at fire-and-forget call sites (or log-and-continue) so an
 * analytics outage or missing configuration cannot fail your request handlers.
 *
 * `group(groupId)` normalizes the group TYPE to `'company'` in every bond
 * (Mixpanel group key, PostHog group type) — look under "company" in the
 * provider's UI.
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
