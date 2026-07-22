/**
 * Bond adapter for the PayPal payment provider.
 *
 * Wraps the PayPal REST functions into a PaymentProvider-compatible interface
 * for use with the molecule.dev bond system.
 *
 * @module
 */

import crypto from 'crypto'

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
import { get } from '@molecule/api-bond'
import {
  isConfigNotConfiguredError,
  type PaymentProvider,
  type PaymentRecordService,
  type SubscriptionUpdateResult,
  type VerifiedSubscription,
  type WebhookEvent,
} from '@molecule/api-payments'

import {
  cancelSubscription as paypalCancelSubscription,
  captureOrder,
  createSubscription,
  getOrder,
  getPlan,
  getSubscription,
  normalizeSubscription,
  normalizeSubscriptionStatus,
  reviseSubscription,
  verifyWebhookSignature,
} from './provider.js'
import type { PayPalPlan, PayPalSubscription } from './types.js'

/**
 * Maps PayPal webhook event types (e.g. `BILLING.SUBSCRIPTION.CANCELLED`) to
 * simplified event type strings (e.g. `created`, `renewed`, `canceled`).
 *
 * `BILLING.SUBSCRIPTION.ACTIVATED` maps to `created` because that is the
 * moment a subscription first becomes entitled (`CREATED` arrives with
 * `APPROVAL_PENDING` and is gated out by status). `PAYMENT.SALE.COMPLETED`
 * maps to `renewed` — it fires on every successful recurring charge.
 * @param eventType - The raw PayPal webhook event type string.
 * @returns A simplified event type like `'created'`, `'renewed'`, `'canceled'`, `'paused'`, `'expired'`, or `'refund'`. Falls through to the raw type for unrecognized events.
 */
const mapPayPalEventType = (eventType: string): string => {
  switch (eventType) {
    case 'BILLING.SUBSCRIPTION.CREATED':
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      return 'created'
    case 'BILLING.SUBSCRIPTION.UPDATED':
    case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
    case 'PAYMENT.SALE.COMPLETED':
      return 'renewed'
    case 'BILLING.SUBSCRIPTION.CANCELLED':
      return 'canceled'
    case 'BILLING.SUBSCRIPTION.SUSPENDED':
      return 'paused'
    case 'BILLING.SUBSCRIPTION.EXPIRED':
      return 'expired'
    case 'PAYMENT.SALE.REFUNDED':
    case 'PAYMENT.SALE.REVERSED':
      return 'refund'
    default:
      return eventType
  }
}

/**
 * Best-effort resolution of a subscription's parent product id from its
 * `plan_id`. Apps register their plan catalogue with PayPal PLAN ids (the
 * env-configured values checkout is started with), while the plan's parent
 * PRODUCT id is the other identifier plan resolution may need — mirroring
 * Stripe's product/price duality. A plan-fetch failure never blocks the
 * flow: the plan id alone still resolves via `priceId`.
 *
 * @param planId - The PayPal billing plan id (`P-...`).
 * @returns The plan object, or `null` when the lookup fails.
 */
const tryGetPlan = async (planId: string): Promise<PayPalPlan | null> => {
  try {
    return await getPlan(planId)
  } catch (error) {
    logger.warn(`PayPal: could not resolve plan ${planId} to its product — continuing without it`, {
      error,
    })
    return null
  }
}

/**
 * Extracts the normalized webhook-subscription fields from a PayPal
 * subscription object (shared by the `BILLING.SUBSCRIPTION.*` branch and the
 * `PAYMENT.SALE.*` branch, which re-fetches the subscription by its
 * `billing_agreement_id`).
 *
 * @param subscription - The PayPal subscription object.
 * @returns The `WebhookEvent['subscription']` fields.
 */
const subscriptionFieldsFromResource = async (
  subscription: PayPalSubscription,
): Promise<NonNullable<WebhookEvent['subscription']>> => {
  const plan = subscription.plan_id ? await tryGetPlan(subscription.plan_id) : null
  const nextBillingTime = subscription.billing_info?.next_billing_time
  const rawStatus = typeof subscription.status === 'string' ? subscription.status : undefined
  return {
    customerId: subscription.subscriber?.payer_id ?? undefined,
    productId: plan?.product_id ?? undefined,
    priceId: subscription.plan_id || undefined,
    expiresAt: nextBillingTime ? new Date(Date.parse(nextBillingTime)).toISOString() : undefined,
    autoRenews: rawStatus === 'ACTIVE',
    status: normalizeSubscriptionStatus(rawStatus),
    isActive: rawStatus === 'ACTIVE',
  }
}

/**
 * PaymentProvider-compatible adapter for PayPal.
 *
 * Wraps the PayPal REST functions into a `PaymentProvider`-compatible object
 * for use with the molecule bond system. Supports subscription verification
 * (billing subscriptions AND one-time orders), webhook handling, plan
 * upgrades/downgrades, and cancellation.
 */
export const paymentProvider: PaymentProvider = {
  providerName: 'paypal',
  verifyFlow: 'subscription',
  notificationFlow: 'webhook',

  /**
   * Verifies a PayPal subscription OR one-time order by id and returns a
   * VerifiedSubscription.
   *
   * Accepts either a billing subscription id (`I-...`) or a v2 checkout order
   * id. Both are server-generated, high-entropy tokens delivered to the client
   * through the per-user post-approval redirect (`return_url`) — the same
   * delivery channel and trust model as a Stripe Checkout session id — so
   * `data.viaCheckoutSession` is set and replay is bounded by the handler's
   * first-claim-wins transaction binding. Subsequent verifications are gated
   * by the stored `customerId` (PayPal payer id) match.
   *
   * An APPROVED-but-not-captured order is captured on verify (capture-on-use).
   * A subscription only verifies when `ACTIVE`: `APPROVAL_PENDING`/`APPROVED`
   * mean the buyer approved but no payment is confirmed yet — granting there
   * would confer entitlement without payment.
   * @param subscriptionId - The PayPal subscription id (`I-...`) or order id.
   * @returns The verified subscription with product, expiry, and renewal info, or `null` on failure.
   */
  async verifySubscription(subscriptionId: string): Promise<VerifiedSubscription | null> {
    try {
      if (subscriptionId.startsWith('I-')) {
        const subscription = await getSubscription(subscriptionId)
        const plan = subscription.plan_id ? await tryGetPlan(subscription.plan_id) : null
        const normalized = normalizeSubscription(subscription, plan ?? undefined)

        // Gate the grant on subscription status: only ACTIVE confers
        // entitlement. APPROVAL_PENDING/APPROVED (payment not confirmed),
        // SUSPENDED (payment failure), CANCELLED, and EXPIRED must NOT
        // re-grant the plan on demand.
        if (!normalized.isActive) {
          logger.info(
            `PayPal verifySubscription: subscription ${normalized.subscriptionId} is not active (status=${normalized.status}) — rejecting`,
          )
          return null
        }

        // Defense in depth: also reject if the next billing time has already
        // elapsed (when known). `isActive` already covers PayPal's
        // authoritative status, but an out-of-date period end is never a
        // valid grant.
        if (normalized.currentPeriodEnd && normalized.currentPeriodEnd <= Date.now()) {
          logger.info(
            `PayPal verifySubscription: subscription ${normalized.subscriptionId} period has ended — rejecting`,
          )
          return null
        }

        return {
          // Surface BOTH identifiers: apps register plans with the env-configured
          // PLAN ids (checkout is started with them), while the plan's parent
          // PRODUCT id is what PayPal reports at the catalog level.
          productId: plan?.product_id ?? normalized.productId,
          priceId: subscription.plan_id,
          transactionId: normalized.subscriptionId,
          expiresAt: normalized.currentPeriodEnd
            ? new Date(normalized.currentPeriodEnd).toISOString()
            : undefined,
          autoRenews: normalized.willRenew,
          data: {
            customerId: subscription.subscriber?.payer_id ?? undefined,
            planId: subscription.plan_id,
            viaCheckoutSession: true,
          },
        }
      }

      // One-time order path. Only a COMPLETED order (funds captured) is a
      // valid purchase; an APPROVED order is captured here first
      // (capture-on-verify), a CREATED one was never buyer-approved.
      let order = await getOrder(subscriptionId)
      if (order.status === 'APPROVED') {
        order = await captureOrder(subscriptionId)
      }
      if (order.status !== 'COMPLETED') {
        logger.info(
          `PayPal verifySubscription: order ${subscriptionId} is not completed (status=${order.status}) — rejecting`,
        )
        return null
      }

      const unit = order.purchase_units?.[0]
      const productId = unit?.reference_id ?? unit?.custom_id ?? ''
      const capture = unit?.payments?.captures?.[0]

      return {
        productId,
        transactionId: capture?.id ?? order.id,
        autoRenews: false,
        data: {
          customerId: order.payer?.payer_id ?? undefined,
          orderId: order.id,
          viaCheckoutSession: true,
        },
      }
    } catch (error) {
      // A missing PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET (getAccessToken()) is a
      // DIFFERENT failure than "no active subscription" — rethrow so the
      // resource handler's catch can surface the actionable 503 instead of a
      // generic 400. Swallowing it into the same `null` a genuine verification
      // failure returns makes an operator's forgotten env var indistinguishable
      // from "this subscription isn't valid."
      if (isConfigNotConfiguredError(error)) {
        throw error
      }
      logger.error('PayPal bondAdapter verifySubscription error:', error)
      return null
    }
  },

  /**
   * Handles a PayPal webhook event by verifying it with PayPal
   * (`/v1/notifications/verify-webhook-signature`) and parsing the payload.
   *
   * Expects an express-like request object with `body` (raw body as Buffer or
   * string, or an already-parsed object) and the `paypal-transmission-id`,
   * `paypal-transmission-time`, `paypal-transmission-sig`, `paypal-cert-url`,
   * and `paypal-auth-algo` headers. Requires `PAYPAL_WEBHOOK_ID`.
   * @param req - An Express-like request object with `body` (or `rawBody`) and the PayPal transmission headers.
   * @returns A parsed webhook event with simplified type and subscription details, or `null` on failure/forgery.
   */
  async handleWebhookEvent(req: unknown): Promise<WebhookEvent | null> {
    try {
      const request = req as {
        body: string | Buffer | Record<string, unknown>
        rawBody?: string | Buffer
        headers: Record<string, string | string[] | undefined>
      }

      const header = (name: string): string | undefined => {
        const value = request.headers[name]
        return Array.isArray(value) ? value[0] : value
      }

      const transmissionId = header('paypal-transmission-id')
      const transmissionTime = header('paypal-transmission-time')
      const transmissionSig = header('paypal-transmission-sig')
      const certUrl = header('paypal-cert-url')
      const authAlgo = header('paypal-auth-algo')

      const rawBody = request.rawBody || request.body
      if (!rawBody || !transmissionId || !transmissionTime || !transmissionSig || !certUrl) {
        logger.error(
          'PayPal bondAdapter handleWebhookEvent: missing body or paypal-transmission-* headers.',
        )
        return null
      }

      // PayPal's verify call takes the event as parsed JSON (unlike Stripe's
      // local HMAC over raw bytes), so the raw body is parsed here. An
      // already-parsed body (some middleware stacks) is used as-is.
      let webhookEvent: Record<string, unknown>
      if (typeof rawBody === 'object' && !Buffer.isBuffer(rawBody)) {
        webhookEvent = rawBody
      } else {
        try {
          webhookEvent = JSON.parse(rawBody.toString()) as Record<string, unknown>
        } catch (parseError) {
          logger.error('PayPal bondAdapter handleWebhookEvent: body is not valid JSON.', parseError)
          return null
        }
      }

      const event = await verifyWebhookSignature({
        authAlgo: authAlgo ?? '',
        certUrl,
        transmissionId,
        transmissionSig,
        transmissionTime,
        webhookEvent,
      })

      // A FAILED verification means a forged or tampered body — never act on it.
      if (!event || !event.type) {
        logger.warn('PayPal bondAdapter handleWebhookEvent: signature verification failed.')
        return null
      }

      const resource = event.resource as Record<string, unknown>

      // Subscription lifecycle events carry the subscription object directly.
      if (event.type.startsWith('BILLING.SUBSCRIPTION.')) {
        return {
          type: mapPayPalEventType(event.type),
          subscription: await subscriptionFieldsFromResource(
            resource as unknown as PayPalSubscription,
          ),
        }
      }

      // Sale events (renewal charges, refunds) carry a `billing_agreement_id`
      // — the subscription id. The body is attacker-influenced until verified,
      // and even a verified sale has no plan/payer detail, so the subscription
      // is RE-FETCHED from PayPal and every surfaced field derived from that
      // authoritative object (mirrors the Google bond's RTDN re-verify).
      if (event.type.startsWith('PAYMENT.SALE.')) {
        const type = mapPayPalEventType(event.type)
        const billingAgreementId =
          typeof resource.billing_agreement_id === 'string'
            ? resource.billing_agreement_id
            : undefined
        if (!billingAgreementId) {
          return { type }
        }
        try {
          const subscription = await getSubscription(billingAgreementId)
          return { type, subscription: await subscriptionFieldsFromResource(subscription) }
        } catch (lookupError) {
          logger.error(
            `PayPal bondAdapter handleWebhookEvent: could not fetch subscription ${billingAgreementId} for ${event.type}:`,
            lookupError,
          )
          return { type }
        }
      }

      // Non-subscription events pass through with their raw type (mirrors the
      // Stripe adapter) so consumers can log/observe them.
      return { type: event.type }
    } catch (error) {
      logger.error('PayPal bondAdapter handleWebhookEvent error:', error)
      return null
    }
  },

  /**
   * Updates or creates a PayPal subscription for a user.
   *
   * 1. Looks up the user's existing PayPal subscription via PaymentRecordService.
   * 2. If found, revises the subscription to the new plan. PayPal usually
   *    requires the buyer to RE-APPROVE revised terms, so the response's
   *    approval URL is returned as a `checkoutUrl` the buyer is sent through.
   * 3. If not found, creates a PayPal billing subscription and returns the
   *    approval URL (the PayPal checkout).
   * @param params - The update parameters.
   * @param params.userId - The molecule user ID to update the subscription for.
   * @param params.newProductId - The PayPal billing plan ID (`P-...`) of the new plan.
   * @param params.previousProductId - The PayPal plan ID of the current plan (unused, for logging context).
   * @returns An object with `updated: true` if the existing subscription was revised without re-approval, or `checkoutUrl` if the buyer must go through PayPal approval.
   */
  async updateSubscription(params: {
    userId: string
    newProductId: string
    previousProductId?: string
  }): Promise<SubscriptionUpdateResult> {
    try {
      const records = get<PaymentRecordService>('paymentRecords')

      // Try to find an existing PayPal subscription for this user.
      if (records) {
        const payment = await records.findByUserId(params.userId, 'paypal')
        const subscriptionId = (payment?.data as Record<string, unknown>)?.subscriptionId as string

        if (subscriptionId) {
          const { subscription, approveUrl } = await reviseSubscription(
            subscriptionId,
            params.newProductId,
          )

          // Buyer re-approval is the common case on a plan change — send the
          // buyer through PayPal's approval link rather than pretending the
          // update applied.
          if (approveUrl) {
            return { updated: false, checkoutUrl: approveUrl }
          }

          const nextBillingTime = subscription.billing_info?.next_billing_time
          return {
            updated: true,
            subscription: {
              expiresAt: nextBillingTime
                ? new Date(Date.parse(nextBillingTime)).toISOString()
                : undefined,
              autoRenews: subscription.status === 'ACTIVE',
            },
          }
        }
      }

      // No existing subscription — create a PayPal billing subscription and
      // return its approval URL. PayPal appends
      // `?subscription_id=I-...&ba_token=...&token=...` to return_url after the
      // buyer approves; the verify-payment route reads that id (see the
      // `subscription_id`/`token` fallbacks in the user resource's
      // verifyPayment handler).
      const apiPort = Number(process.env.PORT) || 4000
      const fallbackApiOrigin = `http://localhost:${apiPort}`
      // Conventional dev frontend lives on apiPort - 1000 (e.g. 4030 → 3030).
      const fallbackAppOrigin = `http://localhost:${apiPort - 1000}`
      const apiOrigin = process.env.API_ORIGIN || process.env.ORIGIN || fallbackApiOrigin
      const appOrigin = process.env.APP_ORIGIN || process.env.ORIGIN || fallbackAppOrigin
      if (apiOrigin === fallbackApiOrigin || appOrigin === fallbackAppOrigin) {
        // Silent localhost redirect URLs in a deployed app strand the user on
        // localhost after paying — make the fallback visible.
        logger.warn(
          `PayPal checkout: API_ORIGIN/APP_ORIGIN/ORIGIN not set — falling back to ${fallbackApiOrigin} / ${fallbackAppOrigin} for redirect URLs (fine in dev, wrong in production).`,
        )
      }

      // Generate idempotency key from userId + planId + timestamp window (5-min buckets)
      // so a double-click or retry collapses to one subscription (PayPal-Request-Id).
      const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000))
      const idempotencyKey = crypto
        .createHash('sha256')
        .update(`checkout:${params.userId}:${params.newProductId}:${timeWindow}`)
        .digest('hex')

      const session = await createSubscription({
        planId: params.newProductId,
        returnUrl: `${apiOrigin}/api/users/${params.userId}/verify-payment/paypal`,
        cancelUrl: appOrigin,
        customId: params.userId,
        idempotencyKey,
      })

      if (session?.id && session?.url) {
        return { updated: false, checkoutUrl: session.url }
      }

      return { updated: false }
    } catch (error) {
      // See the matching comment in verifySubscription: a missing secret must
      // reach the caller as its real 503, not be flattened into the same
      // `{ updated: false }` a genuine update failure returns.
      if (isConfigNotConfiguredError(error)) {
        throw error
      }
      logger.error('PayPal bondAdapter updateSubscription error:', error)
      return { updated: false }
    }
  },

  /**
   * Cancels an existing PayPal subscription for a user.
   *
   * Looks up the subscription via PaymentRecordService, then cancels it with
   * PayPal. NOTE: PayPal cancellation is IMMEDIATE (there is no
   * cancel-at-period-end) — the subscription terminates at once.
   * @param params - The cancellation parameters.
   * @param params.userId - The molecule user ID whose subscription should be canceled.
   * @returns `true` if the subscription was canceled, `false` otherwise.
   */
  async cancelSubscription(params: { userId: string }): Promise<boolean> {
    try {
      const records = get<PaymentRecordService>('paymentRecords')
      if (!records) return false

      const payment = await records.findByUserId(params.userId, 'paypal')
      const subscriptionId = (payment?.data as Record<string, unknown>)?.subscriptionId as string

      if (!subscriptionId) return false

      return await paypalCancelSubscription(subscriptionId)
    } catch (error) {
      // See the matching comment in verifySubscription.
      if (isConfigNotConfiguredError(error)) {
        throw error
      }
      logger.error('PayPal bondAdapter cancelSubscription error:', error)
      return false
    }
  },
}
