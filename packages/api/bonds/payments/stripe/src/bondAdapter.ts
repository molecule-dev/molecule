/**
 * Bond adapter for the Stripe payment provider.
 *
 * Wraps the Stripe SDK functions into a PaymentProvider-compatible interface
 * for use with the molecule.dev bond system.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import { get } from '@molecule/api-bond'
import type {
  PaymentProvider,
  PaymentRecordService,
  SubscriptionUpdateResult,
  VerifiedSubscription,
  WebhookEvent,
} from '@molecule/api-payments'

import {
  createCheckoutSession,
  getSubscription,
  normalizeSubscription,
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
   * Retrieves the subscription from Stripe, normalizes it, then maps to the
   * VerifiedSubscription interface expected by the bond system.
   * @param subscriptionId - The Stripe subscription ID (e.g. `sub_xxx`).
   * @returns The verified subscription with product, expiry, and renewal info, or `null` on failure.
   */
  async verifySubscription(subscriptionId: string): Promise<VerifiedSubscription | null> {
    try {
      const subscription = await getSubscription(subscriptionId)

      if (!subscription) {
        return null
      }

      const normalized = normalizeSubscription(subscription)

      return {
        productId: normalized.productId,
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
        },
      }
    } catch (error) {
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

      // Extract the product ID from the subscription items.
      const items = subscriptionData.items as { data?: Array<{ price?: { product?: string } }> }
      const productId = items?.data?.[0]?.price?.product
        ? String(items.data[0].price.product)
        : undefined

      // Get period end from the subscription item (Stripe API v2022+).
      const subscriptionItem = (items?.data?.[0] ?? {}) as Record<string, unknown>
      const periodEnd = subscriptionItem.current_period_end as number | undefined
      const expiresAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined

      const autoRenews =
        event.type !== 'customer.subscription.deleted' &&
        !subscriptionData.canceled_at &&
        !subscriptionData.cancel_at_period_end

      return {
        type: mapStripeEventType(event.type),
        subscription: {
          customerId: subscriptionData.customer ? String(subscriptionData.customer) : undefined,
          productId,
          expiresAt,
          autoRenews,
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
      const apiOrigin = process.env.API_ORIGIN || process.env.ORIGIN || ''
      const appOrigin = process.env.APP_ORIGIN || process.env.ORIGIN || ''

      const jwtProvider = get<{ sign(payload: Record<string, unknown>): string }>('jwt')
      if (!jwtProvider) {
        throw new Error('JWT provider must be bonded for Stripe checkout flows.')
      }
      const paymentToken = jwtProvider.sign({
        userId: params.userId,
        productId: params.newProductId,
      })

      const session = await createCheckoutSession({
        priceId: params.newProductId,
        successUrl: `${apiOrigin}/api/users/${params.userId}/verify-payment/stripe?sessionId={CHECKOUT_SESSION_ID}&paymentToken=${paymentToken}`,
        cancelUrl: appOrigin,
      })

      if (session?.id && session?.url) {
        return { updated: false, checkoutUrl: session.url }
      }

      return { updated: false }
    } catch (error) {
      logger.error('Stripe bondAdapter updateSubscription error:', error)
      return { updated: false }
    }
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
      logger.error('Stripe bondAdapter cancelSubscription error:', error)
      return false
    }
  },
}
