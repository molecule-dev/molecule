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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The pricing/plans surface lists every tier with its name, price, and limits
 *   (rendered from `/api/billing/tiers`, not hardcoded).
 * - [ ] A free-tier user who hits a quantitative limit (e.g. creates the max
 *   allowed items, then one more) gets a visible limit/upgrade notice — never a
 *   silent failure, a blank page, or a raw 500.
 * - [ ] The blocked action really is blocked server-side: after a full page reload
 *   the over-limit item was NOT created.
 * - [ ] A higher-tier user (seed or upgrade one) can perform the same action that
 *   was blocked on the free tier.
 * - [ ] Tier-gated features/sections are hidden or clearly locked for tiers that
 *   lack them, and usable for tiers that have them.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './cache.js'
export * from './error.js'
export * from './middleware.js'
export * from './provider.js'
export * from './registry.js'
export * from './types.js'
