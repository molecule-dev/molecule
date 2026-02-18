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
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
