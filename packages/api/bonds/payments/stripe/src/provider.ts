/**
 * Stripe payment provider implementation.
 *
 * @see https://www.npmjs.com/package/stripe
 *
 * @module
 */

import Stripe from 'stripe'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import type { NormalizedSubscription, SubscriptionStatus } from '@molecule/api-payments'

import type {
  CheckoutSessionResult,
  SubscriptionResult,
  SubscriptionUpdateParams,
  WebhookEventResult,
} from './types.js'

/**
 * The lazily-initialized `Stripe` instance.
 *
 * @see http://npmjs.com/package/stripe
 */
let _client: Stripe | null = null

/**
 * Returns the lazily-initialized Stripe client. Throws if `STRIPE_SECRET_KEY` is not set.
 *
 * @returns The shared `Stripe` SDK instance.
 */
export const getClient = (): Stripe => {
  if (!_client) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set.')
    _client = new Stripe(key)
  }
  return _client
}

/**
 * Normalizes a Stripe `Subscription` object to the molecule `SubscriptionResult` type.
 *
 * @param sub - The raw Stripe subscription object.
 * @returns A simplified `SubscriptionResult`.
 */
const toSubscriptionResult = (sub: Stripe.Subscription): SubscriptionResult => {
  const firstItem = sub.items.data[0]
  return {
    id: sub.id,
    status: sub.status,
    items: {
      data: sub.items.data.map((item) => ({
        id: item.id,
        price: item.price
          ? { product: typeof item.price.product === 'string' ? item.price.product : undefined }
          : undefined,
      })),
    },
    current_period_start: firstItem?.current_period_start ?? 0,
    current_period_end: firstItem?.current_period_end ?? 0,
    cancel_at_period_end: sub.cancel_at_period_end,
    canceled_at: sub.canceled_at,
  }
}

/**
 * Creates a Stripe Checkout session for a new subscription.
 *
 * @param options - Checkout configuration.
 * @param options.priceId - The Stripe Price ID for the subscription line item.
 * @param options.successUrl - URL to redirect to after successful payment.
 * @param options.cancelUrl - URL to redirect to if the user cancels.
 * @param options.customerId - Optional existing Stripe Customer ID.
 * @param options.metadata - Optional key-value metadata to attach to the session.
 * @returns The checkout session ID and URL.
 */
export const createCheckoutSession = async (options: {
  priceId: string
  successUrl: string
  cancelUrl: string
  customerId?: string
  metadata?: Record<string, string>
}): Promise<CheckoutSessionResult> => {
  try {
    const session = await getClient().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: options.priceId,
          quantity: 1,
        },
      ],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl,
      customer: options.customerId,
      metadata: options.metadata,
    })

    return { id: session.id, url: session.url }
  } catch (error) {
    logger.error(`Error creating Stripe checkout session:`, error)
    throw error
  }
}

/**
 * Retrieves a Stripe Checkout session by ID.
 *
 * @param sessionId - The Stripe Checkout session ID.
 * @returns The session ID and URL.
 */
export const getCheckoutSession = async (sessionId: string): Promise<CheckoutSessionResult> => {
  try {
    const session = await getClient().checkout.sessions.retrieve(sessionId)
    return { id: session.id, url: session.url }
  } catch (error) {
    logger.error(`Error retrieving Stripe checkout session:`, error)
    throw error
  }
}

/**
 * Retrieves a Stripe subscription by ID with expanded item data.
 *
 * @param subscriptionId - The Stripe subscription ID.
 * @returns The normalized subscription result.
 */
export const getSubscription = async (subscriptionId: string): Promise<SubscriptionResult> => {
  try {
    const subscription = await getClient().subscriptions.retrieve(subscriptionId, {
      expand: ['items.data'],
    })
    return toSubscriptionResult(subscription)
  } catch (error) {
    logger.error(`Error retrieving Stripe subscription:`, error)
    throw error
  }
}

/**
 * Immediately cancels a Stripe subscription.
 *
 * @param subscriptionId - The Stripe subscription ID to cancel.
 * @returns The canceled subscription result.
 */
export const cancelSubscription = async (subscriptionId: string): Promise<SubscriptionResult> => {
  try {
    const subscription = await getClient().subscriptions.cancel(subscriptionId)
    return toSubscriptionResult(subscription)
  } catch (error) {
    logger.error(`Error canceling Stripe subscription:`, error)
    throw error
  }
}

/**
 * Updates a Stripe subscription (e.g. changes plan, sets cancel_at_period_end).
 *
 * @param subscriptionId - The Stripe subscription ID to update.
 * @param params - The Stripe subscription update parameters.
 * @returns The updated subscription result.
 */
export const updateSubscription = async (
  subscriptionId: string,
  params: SubscriptionUpdateParams,
): Promise<SubscriptionResult> => {
  try {
    const subscription = await getClient().subscriptions.update(
      subscriptionId,
      params as Stripe.SubscriptionUpdateParams,
    )
    return toSubscriptionResult(subscription)
  } catch (error) {
    logger.error(`Error updating Stripe subscription:`, error)
    throw error
  }
}

/**
 * Verifies a Stripe webhook signature and parses the event payload.
 * Requires `STRIPE_WEBHOOK_SECRET` env var.
 *
 * @param payload - The raw request body (string or Buffer).
 * @param signature - The `stripe-signature` header value.
 * @returns The verified webhook event with type and data.
 */
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
): WebhookEventResult => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('Missing Stripe webhook secret')
  }
  const event = getClient().webhooks.constructEvent(payload, signature, webhookSecret)
  return {
    type: event.type,
    data: { object: event.data.object as unknown as Record<string, unknown> },
  }
}

/**
 * Normalizes a Stripe-specific `SubscriptionResult` to the common
 * `NormalizedSubscription` interface used across all payment providers.
 *
 * @param subscription - The Stripe subscription result to normalize.
 * @returns A `NormalizedSubscription` with provider-agnostic fields.
 */
export const normalizeSubscription = (subscription: SubscriptionResult): NormalizedSubscription => {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: 'active',
    canceled: 'canceled',
    incomplete: 'pending',
    incomplete_expired: 'expired',
    past_due: 'past_due',
    paused: 'paused',
    trialing: 'trialing',
    unpaid: 'past_due',
  }

  return {
    provider: 'stripe',
    subscriptionId: subscription.id,
    productId: (subscription.items.data[0]?.price?.product as string) || '',
    status: statusMap[subscription.status] || 'unknown',
    isActive: subscription.status === 'active' || subscription.status === 'trialing',
    currentPeriodStart: subscription.current_period_start * 1000,
    currentPeriodEnd: subscription.current_period_end * 1000,
    willRenew: !subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? subscription.canceled_at * 1000 : undefined,
    rawData: subscription as unknown as Record<string, unknown>,
  }
}
