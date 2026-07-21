/**
 * Express billing routes for molecule.dev.
 *
 * Mounts the full `/billing/*` contract `@molecule/app-billing-react` expects:
 * `GET /tiers`, `GET /status`, `POST /checkout`, `POST /cancel`, and
 * `POST /portal`. The writes (checkout/cancel/portal) run against the bonded
 * `payments` provider (Stripe by default); the reads (tiers/status) serve the
 * configured tiers and the resolved user status. Authenticated routes use the
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

import { get as bondGet } from '@molecule/api-bond'
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

/** Default bond name used when `options.providerName` is not supplied. */
const DEFAULT_PROVIDER_NAME = 'stripe'

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
 * @returns The frontend-shaped pricing entry.
 */
const tierDefToPricingEntry = <TLimits extends Record<string, unknown>>(
  tier: TierDef<TLimits>,
  formatPrice: PriceFormatter,
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
        stripePriceId: tier.stripePriceId ?? null,
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
 * Resolves the billing provider — either the injected one or the bonded
 * `payments:<providerName>` instance.
 *
 * @param options - The billing-routes options.
 * @returns The resolved provider, or `null` if none is bonded.
 */
const resolveProvider = <TLimits extends Record<string, unknown>>(
  options: BillingRoutesOptions<TLimits>,
): BillingProvider | null => {
  if (options.provider) return options.provider
  const name = options.providerName ?? DEFAULT_PROVIDER_NAME
  const bonded = bondGet<BillingProvider>('payments', name)
  return bonded ?? null
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
 *   by default, or serves `options.getPricingTiers()` verbatim when supplied.
 *   No auth.
 * - `GET /status` — the signed-in user's current tier snapshot
 *   `{ planKey, category, name, limits, isFree }`. Returns 401 when
 *   unauthenticated. Uses `options.resolveStatus` when supplied; otherwise
 *   returns the default (first / free) tier snapshot.
 * - `POST /checkout` — body `{ priceId: string }`. Calls
 *   `provider.updateSubscription({ userId, newProductId: priceId })`. Returns
 *   `{ checkoutUrl }` for new subscriptions or `{ updated, subscription }`
 *   for in-place plan changes.
 * - `POST /cancel` — no body. Calls `provider.cancelSubscription({ userId })`
 *   and returns `{ canceled: true }` on success.
 * - `POST /portal` — body `{ returnUrl?: string }`. Calls
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
  const plansBond = bondGet<{
    registerPlans?: (plans: Record<string, unknown>) => void
  }>('plans')
  if (plansBond?.registerPlans) {
    const providerName = options.providerName ?? 'stripe'
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

    const provider = resolveProvider(options)
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

    const provider = resolveProvider(options)
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

    const provider = resolveProvider(options)
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

    const body = (req.body ?? {}) as { returnUrl?: unknown }
    const returnUrl = typeof body.returnUrl === 'string' ? body.returnUrl : undefined

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
      logger.warn('billing.portal: provider.createPortalSession failed', { error })
      sendError(
        res,
        502,
        'billing.portalFailed',
        'Could not create customer-portal session. Try again later.',
      )
    }
  })

  /** Builds the `GET /tiers` response — either the injected pricing table or one derived per `TierDef`. */
  const buildTiersResponse = (): PricingTiersResponse<TLimits> => {
    if (options.getPricingTiers) {
      return { data: [...options.getPricingTiers()] }
    }
    const formatPrice = options.formatPrice ?? defaultFormatPrice
    return {
      data: tiers.getPricingTiers().map((tier) => tierDefToPricingEntry(tier, formatPrice)),
    }
  }

  /**
   * Default `GET /status` snapshot when no `resolveStatus` is configured — the
   * first (cheapest / free) declared tier, reported as the free tier. Apps wire
   * `resolveStatus` to report the user's real plan.
   */
  const defaultStatusSnapshot = (): BillingStatusResponse<TLimits> => {
    const first = tiers.getPricingTiers()[0]
    return {
      planKey: first?.id ?? 'free',
      category: 'free',
      name: first?.name ?? 'Free',
      limits: (first?.limits ?? {}) as TLimits,
      isFree: true,
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
        // Resolver returned null → fall through to the default snapshot.
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

    res.json(defaultStatusSnapshot())
  })

  return router
}
