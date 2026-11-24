/**
 * Express billing routes for molecule.dev.
 *
 * Mounts the full `/billing/*` contract `@molecule/app-billing-react` expects:
 * `GET /tiers`, `GET /status`, `POST /checkout`, `POST /cancel`, and
 * `POST /portal`. The writes (checkout/cancel/portal) run against the bonded
 * `payments` provider (the one that can check out, when no name is given); the
 * reads (tiers/status) serve the configured tiers and the user's plan. Authenticated routes use the
 * supplied `resolveUserId` resolver, and checkout validates that requested
 * price IDs come from the configured tier set.
 *
 * Error bodies follow the `BillingErrorBody` shape — `{ code, message }` with
 * stable English fallbacks. Apps that need localization can wrap the router
 * with a response interceptor; this package itself ships no locale bond
 * (handler-error pattern, per the design proposal).
 *
 * @module
 */

// Side-effect import: registers this package's secret definitions so the
// runtime registry is populated even when routes.js is imported directly
// (not through the package barrel).
import './secrets.js'
import { type Request, type Response, type Router as ExpressRouter, Router } from 'express'

import { get as bondGet, getAll as bondGetAll } from '@molecule/api-bond'
import { logger } from '@molecule/api-logger'

import type {
  BillingErrorBody,
  BillingProvider,
  BillingRoutesOptions,
  BillingStatusResponse,
  PriceFormatter,
  PricingTierEntry,
  PricingTiersResponse,
  TierDef,
} from './types.js'

/**
 * The bond name preferred when several bonded payments providers could serve the routes and
 * `options.providerName` names none of them.
 */
const DEFAULT_PROVIDER_NAME = 'stripe'

/** A billing provider and the name it is bonded under (the `:provider` of the verify routes). */
interface ResolvedProvider {
  name: string
  provider: BillingProvider
}

/** The users-table read `GET /status` makes through the bonded `datastore` (`@molecule/api-database`). */
interface UserStore {
  findById?(table: string, id: string): Promise<Record<string, unknown> | null>
}

/** The plan lookup of the bonded `plans` service (`@molecule/api-resource-payment`). */
interface PlanLookup {
  findPlan?(
    planKey: string,
  ): { title?: string; capabilities?: { premium?: boolean } } | null | undefined
  registerPlans?(plans: Record<string, unknown>): void
}

/**
 * Whether a caught value is the tagged "secret not configured" error a payments bond rethrows
 * (`statusCode` + `errorKey: 'config.notConfigured'`, as `@molecule/api-payments`'s
 * `isConfigNotConfiguredError` checks). Kept inline so this package's peer range need not move.
 *
 * @param error - The caught value.
 * @returns `true` when it carries a status code and the config key.
 */
const isConfigNotConfigured = (
  error: unknown,
): error is Error & { statusCode: number; errorKey: string } =>
  typeof error === 'object' &&
  error !== null &&
  (error as { errorKey?: unknown }).errorKey === 'config.notConfigured' &&
  typeof (error as { statusCode?: unknown }).statusCode === 'number'

/**
 * Whether a tier costs nothing: neither price is above zero.
 *
 * @param tier - The tier definition.
 * @returns `true` for a free tier.
 */
const isFreeTier = (tier: TierDef<Record<string, unknown>> | undefined): boolean =>
  !((tier?.priceMonthly ?? 0) > 0 || (tier?.priceYearly ?? 0) > 0)

/**
 * Default price formatter — renders a smallest-currency-unit amount as a USD
 * display string with a per-period suffix. Free ($0) prices drop the suffix.
 * Apps in other currencies/locales pass `formatPrice` to override.
 *
 * @param amountMinor - Price in the smallest currency unit (e.g. `1200` = $12.00).
 * @param period - The billing cadence the amount is for.
 * @returns A display string (e.g. `'$12/mo'`, `'$120/yr'`, `'$0'`).
 */
const defaultFormatPrice: PriceFormatter = (amountMinor, period): string => {
  const major = amountMinor / 100
  const amount = Number.isInteger(major) ? `$${major}` : `$${major.toFixed(2)}`
  if (amountMinor === 0) return amount
  return period === 'year' ? `${amount}/yr` : `${amount}/mo`
}

/**
 * Maps one `TierDef` to the frontend `PricingTierEntry` shape. The `TierDef`
 * model treats each billing period as its own tier, so each maps to a single
 * price row: the period is `'year'` only when `priceYearly` is set and
 * `priceMonthly` is not, otherwise `'month'`.
 *
 * @param tier - The source tier definition.
 * @param formatPrice - Formatter for the display price string.
 * @param purchasable - Whether a bonded provider can start a checkout; without one no price
 *   carries a price id, so the app offers nothing to buy.
 * @returns The frontend-shaped pricing entry.
 */
const tierDefToPricingEntry = <TLimits extends Record<string, unknown>>(
  tier: TierDef<TLimits>,
  formatPrice: PriceFormatter,
  purchasable: boolean,
): PricingTierEntry<TLimits> => {
  const period: 'month' | 'year' =
    tier.priceYearly != null && tier.priceMonthly == null ? 'year' : 'month'
  const amountMinor = (period === 'year' ? tier.priceYearly : tier.priceMonthly) ?? 0
  return {
    key: tier.id,
    name: tier.name,
    prices: [
      {
        period,
        price: formatPrice(amountMinor, period),
        stripePriceId: purchasable ? (tier.stripePriceId ?? null) : null,
      },
    ],
    limits: (tier.limits ?? {}) as TLimits,
  }
}

/**
 * Default user-id resolver — reads `res.locals.session.userId`. This matches
 * the convention used across molecule API templates and resource handlers.
 *
 * @param _req - Unused request object.
 * @param res - The Express response carrying `locals.session`.
 * @returns The authenticated user ID, or `null` if the session is missing.
 */
const defaultResolveUserId = (_req: unknown, res: unknown): string | null => {
  const locals = (res as { locals?: { session?: { userId?: string } } } | undefined)?.locals
  return locals?.session?.userId ?? null
}

/**
 * Sends a JSON error response with a stable code and English fallback.
 *
 * @param res - Express response.
 * @param status - HTTP status code.
 * @param code - Stable, machine-readable error code.
 * @param message - English fallback message.
 */
const sendError = (res: Response, status: number, code: string, message: string): void => {
  const body: BillingErrorBody = { code, message }
  res.status(status).json(body)
}

/**
 * Resolves the billing provider: the injected one, the bonded `payments:<providerName>` when a
 * name is given, or else the bonded payments provider that can start a checkout
 * (`updateSubscription`). Several such providers resolve to the one named `'stripe'`; a stack
 * with one payments provider of any kind resolves to it (cancel and portal still work).
 *
 * @param options - The billing-routes options.
 * @returns The provider and its bond name, or `null` if none is bonded.
 */
const resolveProvider = <TLimits extends Record<string, unknown>>(
  options: BillingRoutesOptions<TLimits>,
): ResolvedProvider | null => {
  if (options.provider) {
    return { name: options.providerName ?? DEFAULT_PROVIDER_NAME, provider: options.provider }
  }
  if (options.providerName) {
    const named = bondGet<BillingProvider>('payments', options.providerName)
    return named ? { name: options.providerName, provider: named } : null
  }
  const bonded = [...bondGetAll<BillingProvider>('payments')]
  const checkout = bonded.filter(
    ([, provider]) => typeof provider.updateSubscription === 'function',
  )
  const preferred = (
    entries: Array<[string, BillingProvider]>,
  ): [string, BillingProvider] | undefined =>
    entries.length === 1 ? entries[0] : entries.find(([name]) => name === DEFAULT_PROVIDER_NAME)
  const picked = preferred(checkout) ?? preferred(bonded)
  return picked ? { name: picked[0], provider: picked[1] } : null
}

/**
 * Creates a drop-in Express `Router` exposing the standard billing routes —
 * the exact `/billing/*` contract `@molecule/app-billing-react`
 * (`usePricingTiers` / `useBillingStatus` / `<PricingPage />` /
 * `<BillingStatusBadge />`) consumes.
 *
 * Mounted routes:
 * - `GET /tiers` — public pricing table. Returns
 *   `{ data: PricingTierEntry[] }`. Derives one entry per configured `TierDef`
 *   by default, or serves `options.getPricingTiers()` when supplied. A price
 *   carries its `stripePriceId` only while the bonded provider can start a
 *   checkout, so a price without one is not for sale. No auth.
 * - `GET /status` — the signed-in user's current tier snapshot
 *   `{ planKey, category, name, limits, isFree }`. Returns 401 when
 *   unauthenticated. Uses `options.resolveStatus` when supplied; otherwise
 *   reads the user's `planKey` from the `users` table through the bonded
 *   `datastore` and reports that tier (the first, free one when unset or expired).
 * - `POST /checkout` — body `{ priceId: string }`. Calls
 *   `provider.updateSubscription({ userId, newProductId: priceId })`. Returns
 *   `{ checkoutUrl }` for new subscriptions or `{ updated, subscription }`
 *   for in-place plan changes.
 * - `POST /cancel` — no body. Calls `provider.cancelSubscription({ userId })`
 *   and returns `{ canceled: true }` on success.
 * - `POST /portal` — body `{ returnPath?: string }` (an app-relative path such
 *   as `/billing`; a legacy `returnUrl` is accepted only when it is already on
 *   the app origin, since the provider renders it as a link and an arbitrary one
 *   would be an open redirect). Calls
 *   `provider.createPortalSession({ userId, returnUrl })` and returns
 *   `{ url }`. Returns 501 if the bonded provider does not implement portal
 *   sessions.
 *
 * The router is NOT mounted under any prefix — callers wire it under `/billing`
 * so the app-facing paths are `/api/billing/*`, e.g.
 * `app.use('/api/billing', createBillingRoutes(...))`. (The scaffolded Vite dev
 * proxy forwards `/api` without rewriting, so the mount must include it.)
 *
 * @param options - Tier accessors plus optional provider/auth/pricing/status overrides.
 * @returns An Express `Router` ready to be mounted.
 */
export const createBillingRoutes = <
  TLimits extends Record<string, unknown> = Record<string, unknown>,
>(
  options: BillingRoutesOptions<TLimits>,
): ExpressRouter => {
  const router: ExpressRouter = Router()
  const resolveUserId = options.resolveUserId ?? defaultResolveUserId
  const tiers = options.tiers

  // Bridge the tier catalogue into the `plans` bond (when an app wires one,
  // e.g. @molecule/api-resource-payment) so a completed checkout's price id
  // maps back to a plan at verify/webhook time — without this, payment
  // verification rejects every real purchase with "unknown plan" even though
  // the charge succeeded. Only tiers carrying a platform price id are
  // registered; the free/default plan stays the service's own.
  const plansBond = bondGet<PlanLookup>('plans')
  if (plansBond?.registerPlans) {
    const providerName = resolveProvider(options)?.name ?? DEFAULT_PROVIDER_NAME
    const mapped: Record<string, unknown> = {}
    for (const tier of tiers.getPricingTiers()) {
      if (!tier.stripePriceId) continue
      const cents = tier.priceMonthly ?? tier.priceYearly ?? 0
      mapped[tier.id] = {
        planKey: tier.id,
        platformKey: providerName,
        platformProductId: tier.stripePriceId,
        platformPriceIds: [tier.stripePriceId],
        alias: tier.id,
        period: tier.priceYearly && !tier.priceMonthly ? 'year' : 'month',
        price: `$${cents / 100}`,
        autoRenews: cents > 0,
        title: tier.name,
        description: tier.features.join(', '),
        capabilities: { premium: cents > 0 },
      }
    }
    try {
      plansBond.registerPlans(mapped)
    } catch (error) {
      logger.warn('billing-routes: failed to register tiers into the plans bond', { error })
    }
  }

  // A paid tier without a price id cannot be bought: say so once, at boot, rather than serving
  // a pricing table whose every Upgrade is refused.
  if (!options.getPricingTiers) {
    const declared = tiers.getPricingTiers()
    const unpriced = declared.filter((tier) => !isFreeTier(tier) && !tier.stripePriceId)
    if (unpriced.length > 0 && unpriced.length === declared.filter((t) => !isFreeTier(t)).length) {
      logger.warn(
        `billing-routes: no paid tier has a stripePriceId (${unpriced.map((t) => t.id).join(', ')}), ` +
          'so GET /tiers offers nothing to buy and checkout refuses every price. Set each paid ' +
          "tier's stripePriceId (a scaffold's src/billing-tiers.ts reads them from STRIPE_PRICE_* env vars).",
      )
    }
  }

  /**
   * Passes a provider's "secret not configured" error through with its own status and key
   * (which env var, where to get it) instead of the route's generic failure.
   *
   * @param res - Express response.
   * @param error - The caught value.
   * @returns `true` when the error was answered.
   */
  const sendConfigError = (res: Response, error: unknown): boolean => {
    if (!isConfigNotConfigured(error)) return false
    logger.warn(error.message, { errorKey: error.errorKey })
    sendError(res, error.statusCode, error.errorKey, error.message)
    return true
  }

  /** Computes the set of valid Stripe price IDs from the configured tiers. */
  const validPriceIds = (): Set<string> => {
    const set = new Set<string>()
    for (const tier of tiers.getPricingTiers()) {
      if (tier.stripePriceId) set.add(tier.stripePriceId)
    }
    return set
  }

  router.post('/checkout', async (req: Request, res: Response): Promise<void> => {
    const userId = await resolveUserId(req, res)
    if (!userId) {
      sendError(res, 401, 'auth.unauthorized', 'Authentication required.')
      return
    }

    const body = (req.body ?? {}) as { priceId?: unknown }
    const priceId = typeof body.priceId === 'string' ? body.priceId : ''
    if (!priceId) {
      sendError(res, 400, 'billing.invalidPriceId', 'Body must include a non-empty priceId.')
      return
    }

    if (!validPriceIds().has(priceId)) {
      sendError(res, 400, 'billing.unknownPriceId', `Unknown priceId "${priceId}".`)
      return
    }

    const provider = resolveProvider(options)?.provider
    if (!provider?.updateSubscription) {
      sendError(
        res,
        503,
        'billing.providerUnavailable',
        'Billing provider unavailable. Try again later.',
      )
      return
    }

    try {
      const result = await provider.updateSubscription({ userId, newProductId: priceId })
      if (result.checkoutUrl) {
        res.json({ checkoutUrl: result.checkoutUrl })
        return
      }
      if (result.updated) {
        res.json({ updated: true, subscription: result.subscription })
        return
      }
      sendError(res, 502, 'billing.checkoutFailed', 'Could not start checkout. Try again later.')
    } catch (error) {
      if (sendConfigError(res, error)) return
      logger.warn('billing.checkout: provider.updateSubscription failed', { error })
      sendError(res, 502, 'billing.checkoutFailed', 'Could not start checkout. Try again later.')
    }
  })

  router.post('/cancel', async (req: Request, res: Response): Promise<void> => {
    const userId = await resolveUserId(req, res)
    if (!userId) {
      sendError(res, 401, 'auth.unauthorized', 'Authentication required.')
      return
    }

    const provider = resolveProvider(options)?.provider
    if (!provider?.cancelSubscription) {
      sendError(
        res,
        503,
        'billing.providerUnavailable',
        'Billing provider unavailable. Try again later.',
      )
      return
    }

    try {
      const ok = await provider.cancelSubscription({ userId })
      if (!ok) {
        sendError(res, 400, 'billing.cancelFailed', 'No active subscription to cancel.')
        return
      }
      res.json({ canceled: true })
    } catch (error) {
      if (sendConfigError(res, error)) return
      logger.warn('billing.cancel: provider.cancelSubscription failed', { error })
      sendError(res, 502, 'billing.cancelFailed', 'No active subscription to cancel.')
    }
  })

  router.post('/portal', async (req: Request, res: Response): Promise<void> => {
    const userId = await resolveUserId(req, res)
    if (!userId) {
      sendError(res, 401, 'auth.unauthorized', 'Authentication required.')
      return
    }

    const provider = resolveProvider(options)?.provider
    if (!provider) {
      sendError(
        res,
        503,
        'billing.providerUnavailable',
        'Billing provider unavailable. Try again later.',
      )
      return
    }
    if (!provider.createPortalSession) {
      sendError(
        res,
        501,
        'billing.portalNotSupported',
        'The configured billing provider does not support customer-portal sessions.',
      )
      return
    }

    // The return target becomes the "Return to <merchant>" link on a page
    // hosted by the payment provider, so a caller-supplied absolute URL would
    // make this an open redirect off that domain — a ready-made phishing pivot.
    // Honor only a same-origin absolute PATH (`/billing`), or a URL already on
    // the app origin; anything else falls back to the app root. Same rule as
    // `resolveBillingPortalReturnUrl` in `@molecule/api-payments`, kept inline
    // so this package's peer range need not move ahead of that helper's release.
    const body = (req.body ?? {}) as { returnUrl?: unknown; returnPath?: unknown }
    const apiPort = Number(process.env.PORT) || 4000
    const configuredOrigin = process.env.APP_ORIGIN || process.env.ORIGIN || ''
    const appOrigin = (configuredOrigin || `http://localhost:${apiPort - 1000}`).replace(/\/+$/, '')
    const path =
      typeof body.returnPath === 'string'
        ? body.returnPath
        : typeof body.returnUrl === 'string' && body.returnUrl.startsWith(`${appOrigin}/`)
          ? body.returnUrl.slice(appOrigin.length)
          : ''
    const safePath =
      path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path : ''
    const returnUrl = `${appOrigin}${safePath}`

    try {
      const session = await provider.createPortalSession({ userId, returnUrl })
      if (!session?.url) {
        sendError(
          res,
          502,
          'billing.portalFailed',
          'Could not create customer-portal session. Try again later.',
        )
        return
      }
      res.json({ url: session.url })
    } catch (error) {
      if (sendConfigError(res, error)) return
      logger.warn('billing.portal: provider.createPortalSession failed', { error })
      sendError(
        res,
        502,
        'billing.portalFailed',
        'Could not create customer-portal session. Try again later.',
      )
    }
  })

  /**
   * Builds the `GET /tiers` response — either the injected pricing table or one derived per
   * `TierDef`. A price carries its price id only while a bonded provider can start a checkout
   * (`updateSubscription`): a receipt-only stack (Apple, Google) lists its tiers with nothing to buy.
   */
  const buildTiersResponse = (): PricingTiersResponse<TLimits> => {
    const purchasable = typeof resolveProvider(options)?.provider.updateSubscription === 'function'
    if (options.getPricingTiers) {
      const data = [...options.getPricingTiers()]
      return purchasable
        ? { data }
        : {
            data: data.map((entry) => ({
              ...entry,
              prices: entry.prices.map((price) => ({ ...price, stripePriceId: null })),
            })),
          }
    }
    const formatPrice = options.formatPrice ?? defaultFormatPrice
    return {
      data: tiers
        .getPricingTiers()
        .map((tier) => tierDefToPricingEntry(tier, formatPrice, purchasable)),
    }
  }

  /**
   * The status snapshot of one declared tier (the first, free one when `tier` is undefined).
   *
   * @param tier - The user's tier.
   * @returns The snapshot `GET /status` answers.
   */
  const tierSnapshot = (tier: TierDef<TLimits> | undefined): BillingStatusResponse<TLimits> => {
    const shown = tier ?? tiers.getPricingTiers()[0]
    const free = isFreeTier(shown)
    return {
      planKey: shown?.id ?? 'free',
      category: free ? 'free' : (shown?.id ?? 'paid'),
      name: shown?.name ?? 'Free',
      limits: (shown?.limits ?? {}) as TLimits,
      isFree: free,
    }
  }

  /**
   * Default `GET /status`: the user's `planKey` from the `users` table (read through the bonded
   * `datastore`), matched against the declared tiers, then against the bonded `plans` service. A
   * plan whose `planExpiresAt` has passed, an empty `planKey` or a stack with no datastore report
   * the first (free) tier.
   *
   * @param userId - The signed-in user.
   * @returns The user's status snapshot.
   */
  const userStatus = async (userId: string): Promise<BillingStatusResponse<TLimits>> => {
    const store = bondGet<UserStore>('datastore')
    if (!store?.findById) return tierSnapshot(undefined)
    const user = await store.findById('users', userId)
    const planKey = typeof user?.planKey === 'string' ? user.planKey : ''
    const expiresAt = user?.planExpiresAt
    const expired = expiresAt != null && Date.parse(String(expiresAt)) < Date.now()
    if (!planKey || expired) return tierSnapshot(undefined)
    const tier = tiers.getTierById(planKey)
    if (tier) return tierSnapshot(tier)
    const plan = bondGet<PlanLookup>('plans')?.findPlan?.(planKey)
    if (!plan) return tierSnapshot(undefined)
    const free = !plan.capabilities?.premium
    return {
      planKey,
      category: free ? 'free' : planKey,
      name: plan.title ?? planKey,
      limits: {} as TLimits,
      isFree: free,
    }
  }

  router.get('/tiers', (_req: Request, res: Response): void => {
    res.json(buildTiersResponse())
  })

  router.get('/status', async (req: Request, res: Response): Promise<void> => {
    const userId = await resolveUserId(req, res)
    if (!userId) {
      sendError(res, 401, 'auth.unauthorized', 'Authentication required.')
      return
    }

    if (options.resolveStatus) {
      try {
        const status = await options.resolveStatus(userId, req, res)
        if (status) {
          res.json(status)
          return
        }
        // Resolver returned null → fall through to the user's stored plan.
      } catch (error) {
        logger.warn('billing.status: resolveStatus failed', { error })
        sendError(
          res,
          502,
          'billing.statusFailed',
          'Could not load billing status. Try again later.',
        )
        return
      }
    }

    try {
      res.json(await userStatus(userId))
    } catch (error) {
      logger.warn('billing.status: reading the user plan failed', { error, userId })
      sendError(res, 502, 'billing.statusFailed', 'Could not load billing status. Try again later.')
    }
  })

  return router
}
