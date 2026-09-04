/**
 * RevenueCat webhook authentication and parsing.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { get as getConfig } from '@molecule/api-config'
import type { SubscriptionStatus, WebhookEvent } from '@molecule/api-payments'
import { configNotConfiguredError } from '@molecule/api-secrets'

const logger = getLogger()

import { assertPurchaseEnvironmentAllowed } from './provider.js'
import {
  DEFAULT_SIGNATURE_TOLERANCE_SECONDS,
  REVENUECAT_SIGNATURE_HEADER,
  verifyWebhookAuthorization,
  verifyWebhookSignature,
} from './signature.js'
import type { RevenueCatWebhookBody, RevenueCatWebhookEventPayload } from './types.js'

/**
 * Maps a RevenueCat event type to the simplified event vocabulary
 * `handlePaymentNotification` (in `@molecule/api-resource-user`) acts on, so the
 * handler never needs RevenueCat-specific knowledge.
 *
 * Only `canceled`, `expired`, `refund` and `revoked` REVOKE the plan there, so
 * an event that turns auto-renew off without ending paid access must NOT map to
 * one of those — see {@link mapEventType} for `CANCELLATION`.
 *
 * @see https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
 */
const EVENT_TYPE_MAP: Record<string, string> = {
  INITIAL_PURCHASE: 'created',
  NON_RENEWING_PURCHASE: 'created',
  RENEWAL: 'renewed',
  UNCANCELLATION: 'renewed',
  PRODUCT_CHANGE: 'renewed',
  SUBSCRIPTION_EXTENDED: 'renewed',
  REFUND_REVERSED: 'renewed',
  TEMPORARY_ENTITLEMENT_GRANT: 'renewed',
  EXPIRATION: 'expired',
  SUBSCRIPTION_PAUSED: 'paused',
  BILLING_ISSUE: 'billing_issue',
}

/**
 * Event types that report on the ACCOUNT rather than on an entitlement, and so
 * carry no subscription for the handler to act on.
 */
const NON_ENTITLEMENT_EVENT_TYPES = new Set([
  'TRANSFER',
  'INVOICE_ISSUANCE',
  'SUBSCRIBER_ALIAS',
  'EXPERIMENT_ENROLLMENT',
  'VIRTUAL_CURRENCY_TRANSACTION',
])

/** Event types after which the subscription will NOT renew at period end. */
const NON_RENEWING_EVENT_TYPES = new Set([
  'NON_RENEWING_PURCHASE',
  'CANCELLATION',
  'EXPIRATION',
  'SUBSCRIPTION_PAUSED',
  'BILLING_ISSUE',
  'TEMPORARY_ENTITLEMENT_GRANT',
])

/**
 * Maps a RevenueCat event type to the simplified vocabulary.
 *
 * `CANCELLATION` is the one type that cannot be mapped from the type alone.
 * RevenueCat fires it BOTH when a customer merely turns auto-renew off (they
 * keep access until `expiration_at_ms`) and when a purchase is refunded. Mapping
 * every `CANCELLATION` to `canceled` would revoke a plan the customer has
 * already paid for, weeks early — so only a refund (`cancel_reason` of
 * `CUSTOMER_SUPPORT`) maps to a revoking type; the rest map to `unsubscribed`,
 * which leaves the entitlement in place and simply reports `autoRenews: false`.
 *
 * @param event - The RevenueCat webhook event payload.
 * @returns The simplified event type; unrecognized types fall through to the raw type lower-cased.
 */
export const mapEventType = (event: RevenueCatWebhookEventPayload): string => {
  const type = event.type ?? ''

  if (type === 'CANCELLATION') {
    return event.cancel_reason === 'CUSTOMER_SUPPORT' ? 'refund' : 'unsubscribed'
  }

  return EVENT_TYPE_MAP[type] ?? type.toLowerCase()
}

/**
 * Derives the normalized subscription status a RevenueCat event leaves the
 * customer in.
 *
 * @param event - The RevenueCat webhook event payload.
 * @param now - Current time in milliseconds since the epoch; injectable for tests.
 * @returns The normalized status.
 */
export const mapEventStatus = (
  event: RevenueCatWebhookEventPayload,
  now: number = Date.now(),
): SubscriptionStatus => {
  const type = event.type ?? ''

  if (type === 'CANCELLATION' && event.cancel_reason === 'CUSTOMER_SUPPORT') return 'canceled'
  if (type === 'EXPIRATION') return 'expired'
  if (type === 'SUBSCRIPTION_PAUSED') return 'paused'
  if (type === 'BILLING_ISSUE') return 'past_due'

  const expiresAtMs = event.expiration_at_ms
  // A null expiry on a purchase event is a lifetime/non-consumable grant, not
  // an expired one.
  if (expiresAtMs !== null && expiresAtMs !== undefined && expiresAtMs <= now) return 'expired'

  return event.period_type?.toUpperCase() === 'TRIAL' ? 'trialing' : 'active'
}

/**
 * Reads a header case-insensitively from a request's header map.
 *
 * @param headers - The request headers.
 * @param name - The lower-case header name to read.
 * @returns The header value, or `undefined` when absent. Repeated headers yield the first value.
 */
export const readHeader = (
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
): string | undefined => {
  if (!headers) return undefined
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== name) continue
    return Array.isArray(value) ? value[0] : value
  }
  return undefined
}

/**
 * Authenticates an incoming RevenueCat webhook.
 *
 * FAILS CLOSED. RevenueCat offers two independent mechanisms — a shared
 * `Authorization` header value and an HMAC-SHA256 signature — and this bond
 * requires whichever ones are configured to ALL pass. If NEITHER
 * `REVENUECAT_WEBHOOK_SIGNING_SECRET` nor `REVENUECAT_WEBHOOK_AUTHORIZATION` is
 * set, the webhook endpoint is a URL anyone can POST a plan grant to, so this
 * throws a tagged config-not-configured error rather than accepting it.
 *
 * @param rawBody - The raw request body EXACTLY as received (needed for the HMAC digest).
 * @param headers - The request headers.
 * @param now - Current time in milliseconds since the epoch; injectable for tests.
 * @returns `true` when every configured mechanism passed.
 * @throws {Error} A tagged config-not-configured error when no webhook authentication is configured at all.
 */
export const authenticateWebhook = (
  rawBody: string | Buffer,
  headers: Record<string, string | string[] | undefined> | undefined,
  now: number = Date.now(),
): boolean => {
  const expectedAuthorization = process.env.REVENUECAT_WEBHOOK_AUTHORIZATION
  const signingSecret = process.env.REVENUECAT_WEBHOOK_SIGNING_SECRET

  if (!expectedAuthorization && !signingSecret) {
    throw configNotConfiguredError(
      'REVENUECAT_WEBHOOK_SIGNING_SECRET',
      'RevenueCat webhook authentication',
    )
  }

  if (expectedAuthorization) {
    const header = readHeader(headers, 'authorization')
    if (!verifyWebhookAuthorization(header, expectedAuthorization)) {
      logger.warn('RevenueCat webhook: Authorization header did not match — rejecting')
      return false
    }
  }

  if (signingSecret) {
    const header = readHeader(headers, REVENUECAT_SIGNATURE_HEADER)
    if (!header) {
      logger.warn(
        `RevenueCat webhook: HMAC signing is configured but the request carried no ${REVENUECAT_SIGNATURE_HEADER} header — rejecting`,
      )
      return false
    }
    const tolerance = Number(
      getConfig<string>(
        'REVENUECAT_WEBHOOK_TOLERANCE_SECONDS',
        String(DEFAULT_SIGNATURE_TOLERANCE_SECONDS),
      ),
    )
    const toleranceSeconds = Number.isFinite(tolerance)
      ? tolerance
      : DEFAULT_SIGNATURE_TOLERANCE_SECONDS

    if (!verifyWebhookSignature(rawBody, header, signingSecret, toleranceSeconds, now)) {
      logger.warn('RevenueCat webhook: HMAC signature failed verification — rejecting')
      return false
    }
  }

  return true
}

/**
 * Parses an AUTHENTICATED RevenueCat webhook body into a normalized
 * `WebhookEvent`.
 *
 * Call {@link authenticateWebhook} first — this function performs no
 * authentication of its own, because the signature covers the raw bytes and
 * this receives the parsed object.
 *
 * @param body - The parsed webhook body (`{ api_version, event }`).
 * @param now - Current time in milliseconds since the epoch; injectable for tests.
 * @returns The normalized event, or `null` when the body carries no usable event or the purchase is a sandbox purchase and `REVENUECAT_ALLOW_SANDBOX` is not enabled.
 */
export const parseWebhookEvent = (
  body: RevenueCatWebhookBody | undefined,
  now: number = Date.now(),
): WebhookEvent | null => {
  const event = body?.event
  if (!event || typeof event !== 'object' || !event.type) {
    logger.warn('RevenueCat webhook: body carried no event.type — rejecting')
    return null
  }

  if (event.type === 'TEST') {
    // The dashboard "Send test event" button — no entitlement change. Logged at
    // info, not error, so a working webhook-URL wiring check doesn't read as
    // broken.
    logger.info('RevenueCat webhook: received TEST event — wiring is working.')
    return { type: 'test' }
  }

  // A sandbox purchase costs nothing, so accepting one grants a real plan for
  // free. Fail closed unless REVENUECAT_ALLOW_SANDBOX=true.
  try {
    assertPurchaseEnvironmentAllowed(event.environment?.toUpperCase() === 'SANDBOX')
  } catch (error) {
    logger.warn('RevenueCat webhook: rejecting sandbox event', { error })
    return null
  }

  const type = mapEventType(event)

  if (NON_ENTITLEMENT_EVENT_TYPES.has(event.type)) {
    // Report the event but attach no subscription, so the notification handler
    // neither grants nor revokes on an account-level change.
    return { type }
  }

  const status = mapEventStatus(event, now)
  const expiresAt =
    event.expiration_at_ms === null || event.expiration_at_ms === undefined
      ? undefined
      : new Date(event.expiration_at_ms).toISOString()

  return {
    type,
    subscription: {
      // RevenueCat's App User ID IS the customer identifier this bond keys on,
      // and `original_app_user_id` is the one that survives aliasing —
      // `app_user_id` is merely the LAST SEEN id, so a subscriber who has since
      // been aliased would not match the record `verifyReceipt` stored. That
      // record's `data.customerId` holds the same original id, and it is what
      // `PaymentRecordService.findByCustomerData` looks the user up by.
      customerId: event.original_app_user_id ?? event.app_user_id,
      productId: event.product_id,
      // Apps register their catalogue with EITHER the store product id or the
      // RevenueCat entitlement id, and the notification handler tries
      // `productId` then `priceId` — so the entitlement id rides in `priceId`
      // to make both registrations resolve.
      priceId: event.entitlement_ids?.[0],
      expiresAt,
      autoRenews: !NON_RENEWING_EVENT_TYPES.has(event.type),
      status,
      isActive: status === 'active' || status === 'trialing',
    },
  }
}
