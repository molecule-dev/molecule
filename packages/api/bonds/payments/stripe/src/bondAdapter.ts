/**
 * Bond adapter for the Stripe payment provider.
 *
 * Wraps the Stripe SDK functions into a PaymentProvider-compatible interface
 * for use with the molecule.dev bond system.
 *
 * @module
 */

import crypto from 'crypto'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import { get } from '@molecule/api-bond'
import {
  type CreateSetupIntentParams,
  isConfigNotConfiguredError,
  type PaymentProvider,
  type PaymentRecordService,
  type ProviderPaymentMethod,
  type SetupIntentResult,
  type SubscriptionUpdateResult,
  type VerifiedSubscription,
  type WebhookEvent,
} from '@molecule/api-payments'

import {
  createCheckoutSession,
  createSetupIntent as stripeCreateSetupIntent,
  detachPaymentMethod as stripeDetachPaymentMethod,
  getCheckoutSession,
  getSubscription,
  normalizeSubscription,
  normalizeSubscriptionStatus,
  retrievePaymentMethod as stripeRetrievePaymentMethod,
  updateSubscription as stripeUpdateSubscription,
  verifyWebhookSignature,
} from './provider.js'

/**
 * Maps Stripe webhook event types (e.g. `customer.subscription.created`) to
 * simplified event type strings (e.g. `created`, `renewed`, `canceled`).
 * @param eventType - The raw Stripe webhook event type string.
 * @returns A simplified event type like `'created'`, `'renewed'`, `'canceled'`, `'paused'`, `'expired'`, or `'trial_ending'`. Falls through to the raw type for unrecognized events.
 */
const mapStripeEventType = (eventType: string): string => {
  switch (eventType) {
    case 'customer.subscription.created':
      return 'created'
    case 'customer.subscription.updated':
      return 'renewed'
    case 'customer.subscription.deleted':
      return 'canceled'
    case 'customer.subscription.paused':
      return 'paused'
    case 'customer.subscription.resumed':
      return 'renewed'
    case 'customer.subscription.pending_update_applied':
      return 'renewed'
    case 'customer.subscription.pending_update_expired':
      return 'expired'
    case 'customer.subscription.trial_will_end':
      return 'trial_ending'
    default:
      return eventType
  }
}

/**
 * PaymentProvider-compatible adapter for Stripe.
 *
 * Wraps the Stripe SDK functions into a `PaymentProvider`-compatible object
 * for use with the molecule bond system. Supports subscription verification,
 * webhook handling, plan upgrades/downgrades, and cancellation.
 */
export const paymentProvider: PaymentProvider = {
  providerName: 'stripe',
  verifyFlow: 'subscription',
  notificationFlow: 'webhook',

  /**
   * Verifies a Stripe subscription by ID and returns a VerifiedSubscription.
   *
   * Accepts either a Subscription ID (`sub_xxx`) or a Checkout Session ID (`cs_xxx`).
   * If a Checkout Session ID is provided, it retrieves the session first to extract
   * the associated subscription ID.
   * @param subscriptionId - The Stripe subscription ID (`sub_xxx`) or checkout session ID (`cs_xxx`).
   * @returns The verified subscription with product, expiry, and renewal info, or `null` on failure.
   */
  async verifySubscription(subscriptionId: string): Promise<VerifiedSubscription | null> {
    try {
      // A Checkout Session ID (`cs_...`) only arrives via the per-user
      // post-checkout redirect (success_url), which is unguessable and bound to
      // the user who started checkout. A bare `sub_...` id, by contrast, can be
      // a value the caller merely learned, so the handler requires an ownership
      // match for it. Surface which path this was so `verifyPayment` can enforce
      // that distinction.
      const viaCheckoutSession = subscriptionId.startsWith('cs_')

      // If this is a Checkout Session ID (from post-checkout redirect), resolve to subscription
      let resolvedSubscriptionId = subscriptionId
      if (viaCheckoutSession) {
        const session = await getCheckoutSession(subscriptionId)
        if (!session.subscription) {
          logger.error('Stripe checkout session has no subscription', { sessionId: subscriptionId })
          return null
        }
        resolvedSubscriptionId = session.subscription
      }

      const subscription = await getSubscription(resolvedSubscriptionId)

      if (!subscription) {
        return null
      }

      const normalized = normalizeSubscription(subscription)

      // Gate the grant on subscription status: only an active/trialing
      // subscription confers entitlement. A past_due/unpaid/canceled/incomplete
      // subscription must NOT re-grant the plan on demand.
      if (!normalized.isActive) {
        logger.info(
          `Stripe verifySubscription: subscription ${normalized.subscriptionId} is not active (status=${normalized.status}) — rejecting`,
        )
        return null
      }

      // Defense in depth: also reject if the current period has already elapsed
      // (when known). `isActive` already covers Stripe's authoritative status,
      // but an out-of-date period end is never a valid grant.
      if (normalized.currentPeriodEnd && normalized.currentPeriodEnd <= Date.now()) {
        logger.info(
          `Stripe verifySubscription: subscription ${normalized.subscriptionId} period has ended — rejecting`,
        )
        return null
      }

      // Apps register their plan catalogue with PRICE ids (the env-configured
      // `STRIPE_<APP>_…` values checkout is started with), while the
      // subscription reports the parent PRODUCT id — surface both so plan
      // resolution can match either.
      const rawItems = (normalized.rawData as Record<string, unknown>)?.items as
        | { data?: Array<{ price?: { id?: string } }> }
        | undefined
      const verifiedPriceId = rawItems?.data?.[0]?.price?.id

      return {
        productId: normalized.productId,
        priceId: verifiedPriceId ? String(verifiedPriceId) : undefined,
        transactionId: normalized.subscriptionId,
        expiresAt: normalized.currentPeriodEnd
          ? new Date(normalized.currentPeriodEnd).toISOString()
          : undefined,
        autoRenews: normalized.willRenew,
        data: {
          customerId:
            typeof (normalized.rawData as Record<string, unknown>)?.customer === 'string'
              ? (normalized.rawData as Record<string, unknown>).customer
              : undefined,
          viaCheckoutSession,
        },
      }
    } catch (error) {
      // A missing STRIPE_SECRET_KEY (getClient()) is a DIFFERENT failure than
      // "no active subscription" — rethrow so the resource handler's catch can
      // surface the actionable 503 instead of a generic 400. Swallowing it into
      // the same `null` a genuine verification failure returns makes an
      // operator's forgotten env var indistinguishable from "this subscription
      // isn't valid."
      if (isConfigNotConfiguredError(error)) {
        throw error
      }
      logger.error('Stripe bondAdapter verifySubscription error:', error)
      return null
    }
  },

  /**
   * Handles a Stripe webhook event by verifying the signature and parsing the payload.
   *
   * Expects an express-like request object with `body` (raw body as Buffer or string)
   * and `headers` containing `stripe-signature`.
   * @param req - An Express-like request object with `body` (or `rawBody`) and `headers['stripe-signature']`.
   * @returns A parsed webhook event with simplified type and subscription details, or `null` on failure.
   */
  async handleWebhookEvent(req: unknown): Promise<WebhookEvent | null> {
    try {
      const request = req as {
        body: string | Buffer
        rawBody?: string | Buffer
        headers: Record<string, string | string[] | undefined>
      }

      const rawBody = request.rawBody || request.body
      const signature = request.headers['stripe-signature']

      if (!rawBody || !signature) {
        logger.error('Stripe bondAdapter handleWebhookEvent: missing body or stripe-signature.')
        return null
      }

      const event = verifyWebhookSignature(
        rawBody,
        Array.isArray(signature) ? signature[0] : signature,
      )

      // Only process subscription-related events.
      if (!event.type.startsWith('customer.subscription.')) {
        return {
          type: event.type,
        }
      }

      const subscriptionData = event.data.object as Record<string, unknown>

      // Extract the product AND price IDs from the subscription items — apps
      // register plans by PRICE id (env-configured), so plan resolution needs
      // both candidates.
      const items = subscriptionData.items as {
        data?: Array<{ price?: { product?: string; id?: string } }>
      }
      const productId = items?.data?.[0]?.price?.product
        ? String(items.data[0].price.product)
        : undefined
      const priceId = items?.data?.[0]?.price?.id ? String(items.data[0].price.id) : undefined

      // Get period end from the subscription item (Stripe API 2025+ moved it
      // there). Webhook payload shape follows the API version PINNED ON THE
      // WEBHOOK ENDPOINT — older endpoints still send it top-level on the
      // subscription, so fall back to that rather than silently dropping the
      // expiry (a missing expiresAt reads downstream as "never expires").
      const subscriptionItem = (items?.data?.[0] ?? {}) as Record<string, unknown>
      const periodEnd = (subscriptionItem.current_period_end ??
        subscriptionData.current_period_end) as number | undefined
      const expiresAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined

      const autoRenews =
        event.type !== 'customer.subscription.deleted' &&
        !subscriptionData.canceled_at &&
        !subscriptionData.cancel_at_period_end

      // Surface the subscription status so the notification handler can enforce
      // the SAME entitlement gate as `verifySubscription`. `isActive` is derived
      // with the identical rule used by `normalizeSubscription` (active/trialing
      // only). Without this, a renewal-payment failure (Stripe fires a signed
      // `customer.subscription.updated` with status=past_due and an advanced
      // current_period_end) would extend premium for an unpaid cycle.
      const rawStatus =
        typeof subscriptionData.status === 'string' ? subscriptionData.status : undefined
      const status = normalizeSubscriptionStatus(rawStatus)
      const isActive = rawStatus === 'active' || rawStatus === 'trialing'

      return {
        type: mapStripeEventType(event.type),
        subscription: {
          customerId: subscriptionData.customer ? String(subscriptionData.customer) : undefined,
          productId,
          priceId,
          expiresAt,
          autoRenews,
          status,
          isActive,
        },
      }
    } catch (error) {
      logger.error('Stripe bondAdapter handleWebhookEvent error:', error)
      return null
    }
  },

  /**
   * Updates or creates a Stripe subscription for a user.
   *
   * 1. Looks up the user's existing Stripe subscription via PaymentRecordService.
   * 2. If found, updates the subscription to the new product/price.
   * 3. If not found, creates a Stripe Checkout session and returns the checkout URL.
   *
   * Handles subscription updates and new checkout session creation.
   * @param params - The update parameters.
   * @param params.userId - The molecule user ID to update the subscription for.
   * @param params.newProductId - The Stripe Price ID of the new plan to switch to.
   * @param params.previousProductId - The Stripe Price ID of the current plan (unused, for logging context).
   * @returns An object with `updated: true` if the existing subscription was changed, or `checkoutUrl` if a new Checkout session was created.
   */
  async updateSubscription(params: {
    userId: string
    newProductId: string
    previousProductId?: string
  }): Promise<SubscriptionUpdateResult> {
    try {
      const records = get<PaymentRecordService>('paymentRecords')

      // Try to find an existing Stripe subscription for this user.
      if (records) {
        const payment = await records.findByUserId(params.userId, 'stripe')
        const subscriptionId = (payment?.data as Record<string, unknown>)?.subscriptionId as string

        if (subscriptionId) {
          // Existing subscription found — update it with the new price.
          const subscription = await getSubscription(subscriptionId)

          if (subscription?.items?.data?.[0]?.id) {
            const updatedSubscription = await stripeUpdateSubscription(subscriptionId, {
              items: [
                {
                  id: subscription.items.data[0].id,
                  price: params.newProductId,
                },
              ],
            })

            if (updatedSubscription) {
              const subscriptionItem = updatedSubscription.items?.data?.[0]
              const periodEnd = (subscriptionItem as unknown as Record<string, unknown>)
                ?.current_period_end as number | undefined
              const expiresAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined

              return {
                updated: true,
                subscription: {
                  expiresAt,
                  autoRenews: !updatedSubscription.cancel_at_period_end,
                },
              }
            }
          }
        }
      }

      // No existing subscription — create a Stripe Checkout session.
      // Stripe rejects empty/relative success_url and cancel_url with
      // `code: 'url_invalid'`. When neither API_ORIGIN/APP_ORIGIN nor
      // ORIGIN is set (typical in dev / smoke-app spin-ups), fall back to
      // `http://localhost:${PORT}` so checkout still works locally.
      const apiPort = Number(process.env.PORT) || 4000
      const fallbackApiOrigin = `http://localhost:${apiPort}`
      // Conventional dev frontend lives on apiPort - 1000 (e.g. 4030 → 3030).
      // Mirrors the polish-v2 dispatcher's port pairing.
      const fallbackAppOrigin = `http://localhost:${apiPort - 1000}`
      const apiOrigin = process.env.API_ORIGIN || process.env.ORIGIN || fallbackApiOrigin
      const appOrigin = process.env.APP_ORIGIN || process.env.ORIGIN || fallbackAppOrigin
      if (apiOrigin === fallbackApiOrigin || appOrigin === fallbackAppOrigin) {
        // Silent localhost redirect URLs in a deployed app strand the user on
        // localhost after paying — make the fallback visible.
        logger.warn(
          `Stripe checkout: API_ORIGIN/APP_ORIGIN/ORIGIN not set — falling back to ${fallbackApiOrigin} / ${fallbackAppOrigin} for redirect URLs (fine in dev, wrong in production).`,
        )
      }

      // Generate idempotency key from userId + priceId + timestamp window (5-min buckets)
      // This prevents duplicate checkout sessions if the user double-clicks or retries
      const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000))
      const idempotencyKey = crypto
        .createHash('sha256')
        .update(`checkout:${params.userId}:${params.newProductId}:${timeWindow}`)
        .digest('hex')

      const session = await createCheckoutSession({
        priceId: params.newProductId,
        successUrl: `${apiOrigin}/api/users/${params.userId}/verify-payment/stripe?subscriptionId={CHECKOUT_SESSION_ID}`,
        cancelUrl: appOrigin,
        idempotencyKey,
      })

      if (session?.id && session?.url) {
        return { updated: false, checkoutUrl: session.url }
      }

      return { updated: false }
    } catch (error) {
      // See the matching comment in verifySubscription: a missing secret must
      // reach the caller as its real 503, not be flattened into the same
      // `{ updated: false }` a genuine update failure (e.g. Stripe declining
      // the card) returns.
      if (isConfigNotConfiguredError(error)) {
        throw error
      }
      logger.error('Stripe bondAdapter updateSubscription error:', error)
      return { updated: false }
    }
  },

  /**
   * Creates a Stripe SetupIntent so the frontend can confirm a card off-session.
   *
   * @param params - SetupIntent parameters (optional Stripe customer ID, metadata, idempotency key).
   * @returns The SetupIntent ID, client secret, and customer ID.
   */
  async createSetupIntent(params: CreateSetupIntentParams): Promise<SetupIntentResult> {
    return stripeCreateSetupIntent({
      customerId: params.customerId,
      metadata: params.metadata,
      idempotencyKey: params.idempotencyKey,
    })
  },

  /**
   * Retrieves a saved Stripe payment method and returns normalized card metadata.
   *
   * @param providerPaymentMethodId - The Stripe payment method ID (`pm_...`).
   * @returns Card brand/last4/exp, or `null` on failure.
   */
  async getPaymentMethod(providerPaymentMethodId: string): Promise<ProviderPaymentMethod | null> {
    return stripeRetrievePaymentMethod(providerPaymentMethodId)
  },

  /**
   * Detaches a Stripe saved payment method from its customer.
   *
   * @param providerPaymentMethodId - The Stripe payment method ID (`pm_...`).
   * @returns `true` on success, `false` on provider error.
   */
  async detachPaymentMethod(providerPaymentMethodId: string): Promise<boolean> {
    return stripeDetachPaymentMethod(providerPaymentMethodId)
  },

  /**
   * Cancels an existing Stripe subscription for a user.
   *
   * Looks up the subscription via PaymentRecordService, then sets
   * `cancel_at_period_end` to `true` so it expires at the end of the current billing cycle.
   * @param params - The cancellation parameters.
   * @param params.userId - The molecule user ID whose subscription should be canceled.
   * @returns `true` if the subscription was successfully set to cancel at period end, `false` otherwise.
   */
  async cancelSubscription(params: { userId: string }): Promise<boolean> {
    try {
      const records = get<PaymentRecordService>('paymentRecords')
      if (!records) return false

      const payment = await records.findByUserId(params.userId, 'stripe')
      const subscriptionId = (payment?.data as Record<string, unknown>)?.subscriptionId as string

      if (!subscriptionId) return false

      const subscription = await getSubscription(subscriptionId)
      if (!subscription) return false

      const updated = await stripeUpdateSubscription(subscriptionId, {
        cancel_at_period_end: true,
      })

      return !!updated
    } catch (error) {
      // See the matching comment in verifySubscription.
      if (isConfigNotConfiguredError(error)) {
        throw error
      }
      logger.error('Stripe bondAdapter cancelSubscription error:', error)
      return false
    }
  },
}
