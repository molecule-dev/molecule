/**
 * RevenueCat REST transport and normalization for molecule.dev.
 *
 * Talks to RevenueCat's v1 REST API with the runtime's global `fetch` — no
 * vendor SDK, no HTTP client dependency — and maps a customer's subscriptions
 * onto the provider-agnostic `@molecule/api-payments` result types.
 *
 * @see https://www.revenuecat.com/docs/api-v1
 *
 * @remarks
 * **Sandbox purchases are rejected by default (fail-closed).** RevenueCat
 * reports store-sandbox purchases the same way it reports real ones
 * (`is_sandbox: true` on the subscription, `environment: 'SANDBOX'` on the
 * webhook), and a sandbox purchase costs nothing — so accepting one grants a
 * real entitlement for free to anyone with a sandbox tester account.
 * Acceptance is gated on an explicit, default-`false` flag —
 * `REVENUECAT_ALLOW_SANDBOX=true` (read via `@molecule/api-config`) — NOT on
 * `NODE_ENV`. Gating on `NODE_ENV` fails open whenever a deploy forgets to set
 * it (the scaffold ships `NODE_ENV=development`). Enable the flag only for
 * local/CI testing.
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
import { get as getConfig } from '@molecule/api-config'
const logger = getLogger()
// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type { NormalizedSubscription, SubscriptionStatus } from '@molecule/api-payments'
import { configNotConfiguredError } from '@molecule/api-secrets'

import type {
  RevenueCatSubscriber,
  RevenueCatSubscriberResponse,
  RevenueCatSubscription,
} from './types.js'

/**
 * RevenueCat's public REST base URL, including the API version segment.
 *
 * Override it with `REVENUECAT_BASE_URL` (a broker, a compatible endpoint, or
 * a test double); the override must also include the version segment.
 */
export const REVENUECAT_API_BASE_URL = 'https://api.revenuecat.com/v1'

/**
 * An error returned by the RevenueCat REST API.
 *
 * Deliberately NOT tagged with `statusCode`/`errorKey` — those tags make the
 * API middleware echo the status to the caller, and RevenueCat's status
 * (a 401 for a bad server key, a 429 for our own rate limit) is about OUR
 * configuration, not about the caller's request. An unconfigured key throws
 * the tagged {@link configNotConfiguredError} instead, before any request.
 */
export class RevenueCatApiError extends Error {
  /** The HTTP status RevenueCat responded with. */
  readonly status: number
  /** RevenueCat's own error code from the response body, when present. */
  readonly code?: string

  /**
   * Creates a RevenueCat API error.
   *
   * @param message - The message RevenueCat returned, or a fallback description.
   * @param status - The HTTP status of the RevenueCat response.
   * @param code - RevenueCat's error code from the response body, when present.
   */
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'RevenueCatApiError'
    this.status = status
    this.code = code
  }
}

/**
 * Resolves the RevenueCat REST base URL, honouring the `REVENUECAT_BASE_URL`
 * override. Read on every call so a late-resolved config value is honoured.
 *
 * @returns The base URL with any trailing slash removed.
 */
export const getBaseUrl = (): string => {
  const configured = getConfig<string>('REVENUECAT_BASE_URL', REVENUECAT_API_BASE_URL)
  return (configured || REVENUECAT_API_BASE_URL).replace(/\/+$/, '')
}

/**
 * Whether sandbox purchases may be accepted as real entitlements.
 *
 * @returns `true` only when `REVENUECAT_ALLOW_SANDBOX` is explicitly `'true'`.
 */
export const sandboxPurchasesAllowed = (): boolean =>
  getConfig<string>('REVENUECAT_ALLOW_SANDBOX', 'false') === 'true'

/**
 * Rejects a store-sandbox purchase unless `REVENUECAT_ALLOW_SANDBOX=true`.
 *
 * @param isSandbox - Whether the purchase came from the store's sandbox environment.
 * @throws {Error} When the purchase is a sandbox purchase and the flag is not enabled.
 */
export const assertPurchaseEnvironmentAllowed = (isSandbox: boolean | undefined): void => {
  if (isSandbox !== true) return
  if (sandboxPurchasesAllowed()) return
  logger.warn('Rejecting RevenueCat sandbox purchase (REVENUECAT_ALLOW_SANDBOX is not enabled)')
  throw new Error('Sandbox purchases are not accepted.')
}

/**
 * Fetches a customer's info from RevenueCat.
 *
 * `GET /subscribers/{app_user_id}` is a get-OR-CREATE endpoint: an App User ID
 * RevenueCat has never seen comes back `201` with an empty customer rather than
 * `404`, so "no such customer" and "customer with no purchases" are the same
 * response and both correctly yield no entitlement.
 *
 * @param appUserId - The RevenueCat App User ID to look up.
 * @returns The customer-info response body.
 * @throws {Error} A tagged config-not-configured error when `REVENUECAT_SECRET_API_KEY` is unset — thrown BEFORE any network call.
 * @throws {RevenueCatApiError} When RevenueCat responds with a non-2xx status.
 */
export const getSubscriber = async (appUserId: string): Promise<RevenueCatSubscriberResponse> => {
  const apiKey = process.env.REVENUECAT_SECRET_API_KEY
  if (!apiKey) {
    // Fail BEFORE the network call, with a tagged config-not-configured error
    // (mirrors the Stripe bond's getClient()) — not by sending RevenueCat
    // `Bearer undefined` and letting it come back as a 401, which reads as
    // "wrong key" when the real cause is "no key at all," and which the bond
    // adapter's catch would otherwise swallow into the same `null` a genuine
    // "not entitled" returns.
    throw configNotConfiguredError('REVENUECAT_SECRET_API_KEY', 'payments')
  }

  const url = `${getBaseUrl()}/subscribers/${encodeURIComponent(appUserId)}`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })
  } catch (error) {
    logger.error('Error reaching RevenueCat:', error)
    throw error
  }

  const body = (await response.json().catch(() => undefined)) as
    (RevenueCatSubscriberResponse & { code?: number | string; message?: string }) | undefined

  if (!response.ok) {
    const error = new RevenueCatApiError(
      body?.message || `RevenueCat responded with ${response.status}.`,
      response.status,
      body?.code === undefined ? undefined : String(body.code),
    )
    logger.error('RevenueCat API error:', error)
    throw error
  }

  if (!body?.subscriber) {
    const error = new RevenueCatApiError(
      'RevenueCat response contained no subscriber object.',
      response.status,
    )
    logger.error('RevenueCat API error:', error)
    throw error
  }

  return body
}

/**
 * A subscription resolved out of a customer's info, together with the
 * identifiers it was matched by.
 */
export interface RevenueCatSubscriptionMatch {
  /** The store product identifier that keys `subscriber.subscriptions`. */
  productId: string
  /** The entitlement identifier that granted it, when the match came through one. */
  entitlementId?: string
  /** The matched subscription. */
  subscription: RevenueCatSubscription
}

/**
 * Parses a RevenueCat ISO 8601 timestamp to milliseconds since the epoch.
 * @param value - The timestamp string, `null`, or `undefined`.
 * @returns The millisecond timestamp, or `undefined` when absent or unparseable.
 */
const toMs = (value: string | null | undefined): number | undefined => {
  if (!value) return undefined
  const ms = Date.parse(value)
  return isNaN(ms) ? undefined : ms
}

/**
 * The moment a subscription actually stops conferring access — its expiry, or
 * the end of the billing grace period when RevenueCat has opened one (a
 * customer inside a grace period has NOT lost access yet).
 *
 * @param subscription - The RevenueCat subscription.
 * @returns The effective expiry in milliseconds since the epoch, or `undefined` when the subscription carries no expiry at all.
 */
export const getEffectiveExpiry = (subscription: RevenueCatSubscription): number | undefined => {
  const expires = toMs(subscription.expires_date)
  const grace = toMs(subscription.grace_period_expires_date)
  if (expires === undefined) return grace
  if (grace === undefined) return expires
  return Math.max(expires, grace)
}

/**
 * The store's identifier for a subscription's latest transaction, coerced to a
 * string.
 *
 * RevenueCat serializes `store_transaction_id` as a NUMBER for App Store
 * purchases and a string elsewhere, so a bare `===` against a stored value
 * silently fails for iOS customers.
 *
 * @param subscription - The RevenueCat subscription.
 * @returns The transaction id as a string, or `undefined` when absent.
 */
export const getStoreTransactionId = (subscription: RevenueCatSubscription): string | undefined => {
  const id = subscription.store_transaction_id
  if (id === null || id === undefined || id === '') return undefined
  return String(id)
}

/**
 * Resolves an application-configured plan identifier to one of a customer's
 * subscriptions.
 *
 * Apps register their catalogue with EITHER a RevenueCat entitlement
 * identifier (`pro`) or a store product identifier (`com.example.pro.monthly`),
 * and both are legitimate, so both are tried: entitlements first (they are the
 * identifier RevenueCat's own docs steer developers toward), then the
 * `subscriptions` map keyed by store product id.
 *
 * @param subscriber - The `subscriber` object from a customer-info response.
 * @param identifier - The entitlement identifier or store product identifier to resolve.
 * @returns The matched subscription plus the identifiers it was matched by, or `null` when the customer has no such subscription.
 */
export const findSubscription = (
  subscriber: RevenueCatSubscriber,
  identifier: string,
): RevenueCatSubscriptionMatch | null => {
  const entitlement = subscriber.entitlements?.[identifier]
  if (entitlement) {
    const productId = entitlement.product_identifier
    const subscription = subscriber.subscriptions?.[productId]
    if (subscription) {
      return { productId, entitlementId: identifier, subscription }
    }
    // The entitlement exists but names a one-time (non-subscription) purchase,
    // which this bond does not grant — see the module remarks in index.ts.
    return null
  }

  const subscription = subscriber.subscriptions?.[identifier]
  if (!subscription) return null

  // Surface the entitlement that grants this product, when one does, so the
  // caller can offer both identifiers for plan resolution.
  const entitlementId = Object.keys(subscriber.entitlements ?? {}).find(
    (key) => subscriber.entitlements?.[key]?.product_identifier === identifier,
  )

  return { productId: identifier, entitlementId, subscription }
}

/**
 * Returns the customer's subscription with the latest effective expiry.
 *
 * @param subscriber - The `subscriber` object from a customer-info response.
 * @returns The longest-lived subscription plus its identifiers, or `null` when the customer has no subscription carrying an expiry.
 */
export const getLatestSubscription = (
  subscriber: RevenueCatSubscriber,
): RevenueCatSubscriptionMatch | null => {
  const entries = Object.entries(subscriber.subscriptions ?? {})

  return entries.reduce<RevenueCatSubscriptionMatch | null>((latest, [productId, subscription]) => {
    const expiry = getEffectiveExpiry(subscription)
    if (expiry === undefined) return latest
    if (!latest) return findSubscription(subscriber, productId) ?? { productId, subscription }

    const latestExpiry = getEffectiveExpiry(latest.subscription) ?? 0
    if (expiry <= latestExpiry) return latest
    return findSubscription(subscriber, productId) ?? { productId, subscription }
  }, null)
}

/**
 * Whether a RevenueCat subscription currently confers access.
 *
 * A refunded purchase is never active — RevenueCat keeps returning it with its
 * original future `expires_date` after a refund and only sets `refunded_at`, so
 * without this gate a refunded customer could re-verify the same App User ID to
 * re-grant the plan until the original period end.
 *
 * @param subscription - The subscription to check, or `null`.
 * @returns `true` when the subscription is unrefunded and its effective expiry is in the future.
 */
export const isSubscriptionActive = (subscription: RevenueCatSubscription | null): boolean => {
  if (!subscription) return false
  if (subscription.refunded_at) return false

  const expiry = getEffectiveExpiry(subscription)
  if (expiry === undefined) return false

  return expiry > Date.now()
}

/**
 * Whether a subscription will renew at the end of the current period.
 *
 * Read from `unsubscribe_detected_at` — the ONLY field RevenueCat uses to
 * report that the customer turned auto-renew off, independent of whether they
 * are still paid-through. A customer who unsubscribes mid-period keeps access
 * until expiry, so inferring "will renew" from "is active" reports `true` right
 * up until the subscription silently lapses.
 *
 * @param subscription - The subscription to check.
 * @returns `false` when the customer unsubscribed or was refunded, `true` otherwise.
 */
export const willSubscriptionRenew = (subscription: RevenueCatSubscription): boolean => {
  if (subscription.unsubscribe_detected_at) return false
  if (subscription.refunded_at) return false
  return true
}

/**
 * Maps a RevenueCat subscription onto the payments core's normalized status
 * vocabulary.
 *
 * @param subscription - The subscription to classify.
 * @returns The normalized status: `canceled` when refunded, `expired` past its effective expiry, `paused` while a Google Play pause is pending resume, `past_due` while a billing problem is unresolved, `trialing` during a free trial, otherwise `active`.
 */
export const normalizeSubscriptionStatus = (
  subscription: RevenueCatSubscription,
): SubscriptionStatus => {
  if (subscription.refunded_at) return 'canceled'
  if (!isSubscriptionActive(subscription)) return 'expired'
  if (subscription.auto_resume_date) return 'paused'
  if (subscription.billing_issues_detected_at) return 'past_due'
  // `intro` is a discounted-but-PAID period, not a trial — only `trial` is.
  if (subscription.period_type?.toLowerCase() === 'trial') return 'trialing'
  return 'active'
}

/**
 * Normalizes a RevenueCat subscription to the provider-agnostic
 * `NormalizedSubscription` interface.
 *
 * `isActive` is derived from the normalized STATUS (active/trialing only), not
 * from the raw expiry, so a subscription inside an unresolved billing problem
 * or a pending pause does not read as entitling — the same rule the payments
 * core's `isActiveStatus` applies.
 *
 * @param productId - The store product identifier keying this subscription.
 * @param subscription - The RevenueCat subscription to normalize.
 * @returns A `NormalizedSubscription` with provider set to `'revenuecat'` and dates converted to millisecond timestamps.
 */
export const normalizeSubscription = (
  productId: string,
  subscription: RevenueCatSubscription,
): NormalizedSubscription => {
  const status = normalizeSubscriptionStatus(subscription)

  return {
    provider: 'revenuecat',
    subscriptionId: getStoreTransactionId(subscription) ?? productId,
    productId,
    status,
    isActive: status === 'active' || status === 'trialing',
    currentPeriodStart: toMs(subscription.purchase_date),
    currentPeriodEnd: getEffectiveExpiry(subscription),
    willRenew: willSubscriptionRenew(subscription),
    canceledAt: toMs(subscription.refunded_at) ?? toMs(subscription.unsubscribe_detected_at),
    rawData: subscription,
  }
}
