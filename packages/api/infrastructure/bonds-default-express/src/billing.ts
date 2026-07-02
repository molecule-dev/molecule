/**
 * Default Stripe-backed billing router used by ~117 fleet apps.
 *
 * Wraps the bonded Stripe payment provider with the app's plan
 * catalogue. Each route delegates per-tier validation to the
 * `getPricingTiers()` function the app supplies. Webhook handling
 * is delegated to `@molecule/api-resource-user`'s
 * `handlePaymentNotification` route, which already updates
 * `users.planKey` / `planExpiresAt` from Stripe events.
 *
 * Routes:
 * - `POST /checkout` — start a subscription (returns Stripe Checkout URL or `updated: true`)
 * - `POST /cancel`   — cancel at end of current period
 * - `GET  /status`   — current tier + entitlement snapshot
 * - `GET  /tiers`    — public pricing data
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { get, getLogger } from '@molecule/api-bond'
import { getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import type { PaymentProvider } from '@molecule/api-payments'
import { registerPlans, type types as paymentTypes } from '@molecule/api-resource-payment'

import { getUserId } from './handlers.js'

const logger = getLogger()

interface PricingTier {
  key: string
  name?: string
  prices: ReadonlyArray<{
    stripePriceId?: string | null
    period?: string
    price?: string
  }>
}

/**
 * Derives the app's Stripe plan catalogue from its pricing tiers and
 * registers it with `@molecule/api-resource-payment`'s plan registry — the
 * registry `verifyPayment` / `handlePaymentNotification` resolve grants
 * from. Without this, the registry only holds placeholder product ids and
 * EVERY successful payment fails plan resolution ("unknown plan"): the user
 * is charged but never upgraded.
 *
 * planKey derivation follows the fleet convention: `planKeys` maps
 * `${tier.key}Monthly` / `${tier.key}Yearly` (e.g. `proMonthly`) to the
 * entitlements planKey stored on `users.planKey`. Tiers/prices without a
 * Stripe price id (the free tier) are skipped; a paid price whose planKeys
 * entry is missing is skipped WITH a warning, since that plan could never be
 * granted.
 *
 * Idempotent — safe to re-run per request (registration by planKey
 * overwrites), which also covers price-id env vars that only become
 * available after startup secret resolution.
 *
 * @param getPricingTiers - The app's pricing tiers function.
 * @param planKeys - The app's planKeys map (see convention above).
 */
function registerPlansFromTiers(
  getPricingTiers: () => ReadonlyArray<PricingTier>,
  planKeys: Record<string, string>,
): void {
  try {
    const derived: Record<string, paymentTypes.Plan> = {}
    for (const tier of getPricingTiers()) {
      for (const price of tier.prices) {
        if (!price.stripePriceId) continue
        const period = price.period === 'year' ? 'year' : 'month'
        const planKeysKey = `${tier.key}${period === 'year' ? 'Yearly' : 'Monthly'}`
        const planKey = planKeys[planKeysKey]
        if (!planKey) {
          logger.warn(
            `billing: no planKeys entry "${planKeysKey}" for tier "${tier.key}" (${period}) — ` +
              `its Stripe price ${price.stripePriceId} cannot grant a plan`,
          )
          continue
        }
        derived[planKey] = {
          planKey,
          platformKey: 'stripe',
          platformProductId: '',
          platformPriceIds: [price.stripePriceId],
          alias: period === 'year' ? 'yearly' : 'monthly',
          period,
          price: price.price ?? '',
          autoRenews: true,
          title: tier.name ?? tier.key,
          titleKey: '',
          description: tier.name ?? tier.key,
          descriptionKey: '',
          capabilities: { premium: true },
        }
      }
    }
    if (Object.keys(derived).length > 0) registerPlans(derived)
  } catch (error) {
    // Registration failing must not take the billing routes down — but a
    // failure here means paid plans cannot be granted, so say it loudly.
    logger.error('billing: failed to register plans from pricing tiers', { error })
  }
}

/**
 * Factory for the default billing router. The router exposes four
 * endpoints: `POST /checkout`, `POST /cancel`, `GET /status`, `GET /tiers`.
 *
 * @example
 * ```ts
 * // api/src/routes/billing.ts
 * import { createBillingRouter } from '@molecule/api-bonds-default-express'
 * import { blogPlanKeys, getPricingTiers, type BlogLimits } from '../tiers.js'
 *
 * export default createBillingRouter<BlogLimits>({
 *   getPricingTiers,
 *   planKeys: blogPlanKeys,
 * })
 * ```
 */
export function createBillingRouter<TLimits>(opts: {
  /** Returns the app's pricing tiers (with stripePriceId per price). */
  getPricingTiers: () => ReadonlyArray<PricingTier>
  /** App's plan keys object; only `.free` is read here, for the isFree flag in /status. */
  planKeys: { free: string } & Record<string, string>
}): Router {
  const router = Router()

  // Register the app's plan catalogue so payment verification / webhooks can
  // resolve grants. Done at construction AND refreshed per checkout (below)
  // because price-id env vars may only resolve after startup secrets load.
  registerPlansFromTiers(opts.getPricingTiers, opts.planKeys)

  const checkoutSchema = z.object({ priceId: z.string().min(1) })

  /**
   * Set of valid Stripe price IDs declared in `getPricingTiers()`.
   * Reads tiers at request-time (not module-init) so the same code
   * works in test/staging/production where price IDs differ.
   */
  const validPriceIds = (): Set<string> => {
    const set = new Set<string>()
    for (const tier of opts.getPricingTiers()) {
      for (const price of tier.prices) {
        if (price.stripePriceId) set.add(price.stripePriceId)
      }
    }
    return set
  }

  router.post('/checkout', validateBody(checkoutSchema), async (req: Request, res: Response) => {
    // Idempotent refresh — guarantees the plan catalogue reflects the same
    // request-time env the price validation below reads.
    registerPlansFromTiers(opts.getPricingTiers, opts.planKeys)
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, {
          defaultValue: 'Authentication required.',
        }),
      })
      return
    }
    const { priceId } = req.body as z.infer<typeof checkoutSchema>
    if (!validPriceIds().has(priceId)) {
      res.status(400).json({
        error: t(
          'billing.error.unknownPriceId',
          { priceId },
          {
            defaultValue: `Unknown priceId "${priceId}".`,
          },
        ),
      })
      return
    }
    const provider = get<PaymentProvider>('payments', 'stripe')
    if (!provider?.updateSubscription) {
      res.status(503).json({
        error: t('billing.error.providerUnavailable', undefined, {
          defaultValue: 'Billing provider unavailable. Try again later.',
        }),
      })
      return
    }
    const result = await provider.updateSubscription({ userId, newProductId: priceId })
    if (result.checkoutUrl) {
      res.json({ checkoutUrl: result.checkoutUrl })
      return
    }
    if (result.updated) {
      res.json({ updated: true, subscription: result.subscription })
      return
    }
    res.status(502).json({
      error: t('billing.error.checkoutFailed', undefined, {
        defaultValue: 'Could not start checkout. Try again later.',
      }),
    })
  })

  router.post('/cancel', async (_req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, {
          defaultValue: 'Authentication required.',
        }),
      })
      return
    }
    const provider = get<PaymentProvider>('payments', 'stripe')
    if (!provider?.cancelSubscription) {
      res.status(503).json({
        error: t('billing.error.providerUnavailable', undefined, {
          defaultValue: 'Billing provider unavailable. Try again later.',
        }),
      })
      return
    }
    const ok = await provider.cancelSubscription({ userId })
    if (!ok) {
      res.status(400).json({
        error: t('billing.error.cancelFailed', undefined, {
          defaultValue: 'No active subscription to cancel.',
        }),
      })
      return
    }
    res.json({ canceled: true })
  })

  router.get('/status', async (_req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, {
          defaultValue: 'Authentication required.',
        }),
      })
      return
    }
    const tier = await getEffectiveTier<TLimits>(res)
    res.json({
      planKey: tier.planKey,
      category: tier.category,
      name: tier.name,
      limits: tier.limits,
      isFree: tier.planKey === opts.planKeys.free,
    })
  })

  router.get('/tiers', (_req: Request, res: Response) => {
    res.json({ data: opts.getPricingTiers() })
  })

  return router
}
