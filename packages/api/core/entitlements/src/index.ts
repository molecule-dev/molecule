/**
 * Tier-based entitlements core for molecule.dev.
 *
 * Provides the typed `Tier<TLimits>` / `TierRegistry<TLimits>` shapes, a
 * per-process plan-key cache, and Express middleware factories that gate
 * endpoints by tier category or quantitative limit.
 *
 * Apps declare their own `TLimits` shape, construct a registry via
 * `defineTiers(...)`, and bond it via `setProvider(...)` at startup. The
 * webhook glue that maps Stripe / Apple / Google subscription events to
 * `users.planKey` already lives in `@molecule/api-resource-user`.
 *
 * @example
 * ```typescript
 * import { defineTiers, setProvider } from '@molecule/api-entitlements'
 *
 * interface BlogLimits {
 *   maxPosts: number
 *   maxCommentsPerDay: number
 * }
 *
 * const registry = defineTiers<BlogLimits>({
 *   tiers: {
 *     free: { planKey: 'free', category: 'free', name: 'Free', limits: { maxPosts: 5, maxCommentsPerDay: 50 } },
 *     stripeMonthly: { planKey: 'stripeMonthly', category: 'pro', name: 'Pro', limits: { maxPosts: 100, maxCommentsPerDay: 1000 } },
 *   },
 *   defaultPlanKey: 'free',
 *   categoryOrder: ['free', 'pro'],
 * })
 *
 * setProvider(registry)
 * ```
 *
 * @module
 */

export * from './types.js'
export * from './provider.js'
export * from './registry.js'
export * from './cache.js'
export * from './error.js'
export * from './middleware.js'
