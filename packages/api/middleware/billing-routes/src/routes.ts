/**
 * Express billing routes for molecule.dev.
 *
 * Mounts `POST /billing/checkout`, `POST /billing/cancel`, and
 * `POST /billing/portal` against the bonded `payments` provider (Stripe by
 * default). Each route is authenticated via the supplied `resolveUserId`
 * resolver and validates that requested price IDs come from the configured
 * tier set.
 *
 * Error bodies follow the `BillingErrorBody` shape — `{ code, message }` with
 * stable English fallbacks. Apps that need localization can wrap the router
 * with a response interceptor; this package itself ships no locale bond
 * (handler-error pattern, per the design proposal).
 *
 * @module
 */

import { type Request, type Response, type Router as ExpressRouter, Router } from 'express'

import { get as bondGet } from '@molecule/api-bond'
import { logger } from '@molecule/api-logger'

import type { BillingErrorBody, BillingProvider, BillingRoutesOptions } from './types.js'

/** Default bond name used when `options.providerName` is not supplied. */
const DEFAULT_PROVIDER_NAME = 'stripe'

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
 * Creates a drop-in Express `Router` exposing the standard billing routes.
 *
 * Mounted routes:
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
 * The router is NOT mounted under any prefix — callers wire it via
 * `app.use('/billing', createBillingRoutes(...))`.
 *
 * @param options - Tier accessors plus optional provider/auth overrides.
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

  return router
}
