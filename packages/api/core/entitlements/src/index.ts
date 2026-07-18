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
 * import { defineTiers, setProvider, enforceLimit, requireCategoryAtLeast } from '@molecule/api-entitlements'
 * import { count } from '@molecule/api-database'
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
 *
 * // Gate the API routes — the SERVER enforces tiers, never the UI alone:
 * router.post('/posts',
 *   enforceLimit<BlogLimits>({
 *     limitType: 'maxPosts',
 *     getLimit: (limits) => limits.maxPosts,
 *     getCurrent: (userId) => count('posts', [{ field: 'userId', operator: '=', value: userId }]),
 *   }),
 *   handlers.createPost,
 * )
 * router.get('/analytics', requireCategoryAtLeast('pro'), handlers.analytics)
 * ```
 *
 * @remarks
 * - **Enforcement is middleware on the API route** (`requireCategory`,
 *   `requireCategoryAtLeast`, `enforceLimit`) — hiding a button in the UI is
 *   not entitlement enforcement. The middleware reads the authenticated user
 *   from `res.locals.session.userId`, so it must be registered AFTER the auth
 *   middleware; unauthenticated requests get a 401.
 * - **`enforceLimit` blocks at `current >= limit`** and responds with a
 *   structured `LimitErrorPayload` (default 403; pass `status: 429` for
 *   usage-style limits) that the app's limit/upgrade notice renders — don't
 *   swallow it into a generic error page.
 * - **It is a SOFT ceiling — `getCurrent` COUNTS, then the handler CREATES the
 *   resource afterwards.** Under concurrency N requests can all read the same
 *   `current < limit` and all create, so the limit can be exceeded by a few.
 *   That is fine for plan limits (max projects / seats / collaborators — a
 *   bounded, harmless overshoot). It is NOT enough for a HARD limit where going
 *   over is a real loss: money / wallet balances, physical inventory (stock,
 *   tickets, seats), or metered credits. Enforce THOSE atomically at the write
 *   with a conditional `UPDATE ... WHERE remaining >= $n RETURNING` that affects
 *   0 rows when it wouldn't fit (or an advisory-lock reserve for a ledger SUM) —
 *   never a count-then-allow middleware.
 * - **Plan keys are cached per process** (default 5-minute TTL). The
 *   resource-user payment webhook glue invalidates on plan change; any custom
 *   path that mutates a user's `planKey` must call
 *   `invalidateCachedPlanKey(userId)` or the old tier lingers until TTL.
 * - Unknown, expired, or missing plan keys resolve to the `defaultPlanKey`
 *   tier — make the default tier's limits the safe floor.
 * - The middleware factories are connect/Express-shaped conveniences. Other
 *   stacks (queues, websockets, non-Express frameworks) enforce the same tiers
 *   directly via `getProvider()` + `getCachedPlanKey(userId)`.
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
