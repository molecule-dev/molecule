/**
 * PayPal payment provider implementation — plain REST (`fetch`) against the
 * PayPal Orders v2 / Billing v1 APIs. No SDK: the surface this bond needs
 * (OAuth2 client-credentials, orders, plans, subscriptions, webhook
 * verification) is a handful of JSON endpoints, and a dependency-free client
 * keeps the sandbox base image smaller.
 *
 * @see https://developer.paypal.com/docs/api/overview/
 *
 * @module
 */

import { getLogger } from '@molecule/api-bond'
const logger = getLogger()
// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type { NormalizedSubscription, SubscriptionStatus } from '@molecule/api-payments'
import { configNotConfiguredError } from '@molecule/api-secrets'

import type {
  CheckoutSessionResult,
  PayPalOrder,
  PayPalPlan,
  PayPalSubscription,
  WebhookEventResult,
} from './types.js'

/**
 * The default PayPal REST host — the SANDBOX. Live traffic requires opting in
 * via `PAYPAL_BASE_URL=https://api-m.paypal.com` so a misconfigured deploy
 * fails safe (test charges) rather than silently billing real buyers.
 */
export const DEFAULT_BASE_URL = 'https://api-m.sandbox.paypal.com'

/**
 * An error returned by the PayPal REST API. Carries the HTTP status and
 * PayPal's `debug_id` (the value PayPal support asks for) alongside the
 * provider's own error `name`/`message`.
 */
export class PayPalApiError extends Error {
  /** The HTTP status code PayPal responded with. */
  readonly status: number
  /** PayPal's error name (e.g. `RESOURCE_NOT_FOUND`, `INVALID_REQUEST`). */
  readonly paypalName?: string
  /** PayPal's `debug_id` for support correlation. */
  readonly debugId?: string

  /**
   * Creates a PayPalApiError.
   *
   * @param status - The HTTP status code.
   * @param message - A human-readable summary (PayPal's `message` field when present).
   * @param details - Optional PayPal error metadata (`name`, `debug_id`).
   */
  constructor(status: number, message: string, details?: { name?: string; debug_id?: string }) {
    super(message)
    this.name = 'PayPalApiError'
    this.status = status
    this.paypalName = details?.name
    this.debugId = details?.debug_id
  }
}

/**
 * Cached OAuth2 access token, keyed by base URL + client ID so a credential or
 * environment change (tests, secret rotation, sandbox→live switch) re-auths
 * instead of serving a token for the wrong app.
 */
let cachedToken: { key: string; token: string; expiresAt: number } | null = null

/**
 * Returns the configured PayPal API base URL (`PAYPAL_BASE_URL`), defaulting
 * to the sandbox host. Trailing slashes are stripped so path joins are stable.
 *
 * @returns The base URL with no trailing slash.
 */
export const getBaseUrl = (): string => {
  return (process.env.PAYPAL_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

/**
 * Obtains (and caches) an OAuth2 client-credentials access token.
 *
 * Reads `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` lazily at CALL time — ESM
 * import hoisting evaluates this module before app code (dotenv, a secrets
 * bond, test stubs) runs, so reading env at module load would report "not
 * configured" despite the keys being set.
 *
 * @returns A bearer token for the configured app.
 * @throws {Error} A tagged config-not-configured error (`statusCode: 503`,
 *   `errorKey: 'config.notConfigured'`) when either credential is missing.
 */
export const getAccessToken = async (): Promise<string> => {
  const clientId = process.env.PAYPAL_CLIENT_ID
  if (!clientId) {
    // Tag as a config-missing condition (not an internal error): the API error
    // middleware maps `statusCode` + `errorKey` to a clean 503, and the message
    // carries the registered definition's description + setup URL — the user
    // sees exactly which key to set and where to get it, at the exact moment
    // they're trying to upgrade to a paid plan.
    throw configNotConfiguredError('PAYPAL_CLIENT_ID', 'payments')
  }
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientSecret) {
    throw configNotConfiguredError('PAYPAL_CLIENT_SECRET', 'payments')
  }

  const baseUrl = getBaseUrl()
  const cacheKey = `${baseUrl}:${clientId}`
  // Refresh a minute early so an in-flight request never rides a token that
  // expires mid-flight.
  if (cachedToken && cachedToken.key === cacheKey && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as
      | { error?: string; error_description?: string }
      | undefined
    throw new PayPalApiError(
      res.status,
      `PayPal OAuth token request failed (${res.status}): ${body?.error_description ?? body?.error ?? res.statusText}`,
      { name: body?.error },
    )
  }
  const body = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!body.access_token) {
    throw new PayPalApiError(res.status, 'PayPal OAuth token response missing access_token')
  }
  cachedToken = {
    key: cacheKey,
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 300) * 1000,
  }
  return body.access_token
}

/**
 * Performs an authenticated JSON request against the PayPal REST API.
 *
 * @param path - The API path (e.g. `/v1/billing/subscriptions/I-...`).
 * @param init - Fetch options; `body` objects are JSON-serialized.
 * @returns The parsed JSON response, or `undefined` for 204 No Content.
 * @throws {PayPalApiError} On any non-2xx response.
 */
const apiRequest = async <T>(
  path: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
): Promise<T> => {
  const token = await getAccessToken()
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  if (res.status === 204) {
    return undefined as T
  }
  const body = (await res.json().catch(() => undefined)) as
    | (Record<string, unknown> & {
        name?: string
        message?: string
        debug_id?: string
        error?: string
        error_description?: string
      })
    | undefined
  if (!res.ok) {
    // PayPal speaks TWO error dialects: application-level failures carry
    // `{name, message, debug_id}` (e.g. RESOURCE_NOT_FOUND with a support
    // debug id), while auth-layer failures (bad/expired token) answer
    // OAuth-style `{error, error_description}` (observed live: the orders
    // endpoint's 401 is `invalid_token` with no name/message/debug_id). Map
    // both so neither loses the provider's actual reason.
    throw new PayPalApiError(
      res.status,
      `PayPal ${init?.method ?? 'GET'} ${path} failed (${res.status}): ${body?.message ?? body?.error_description ?? res.statusText}`,
      { name: body?.name ?? body?.error, debug_id: body?.debug_id },
    )
  }
  return body as T
}

/**
 * Extracts the buyer-facing approval URL from a resource's HATEOAS links.
 *
 * @param links - The `links` array PayPal returns on created resources.
 * @returns The `approve` link href, or `null` when absent.
 */
const approveUrlFromLinks = (links?: Array<{ rel?: string; href?: string }>): string | null => {
  return links?.find((link) => link.rel === 'approve')?.href ?? null
}

/**
 * Creates a PayPal catalog product (`/v1/catalogs/products`) — the parent of
 * every billing plan. Only needed when provisioning plans from code; a plan
 * created by hand in the dashboard already has one.
 *
 * @param options - Product options.
 * @param options.name - The product name (shown on PayPal checkout pages).
 * @param options.description - Optional product description.
 * @param options.type - `PHYSICAL` | `DIGITAL` | `SERVICE` (default `SERVICE`).
 * @returns The created product id (`PROD-...`).
 */
export const createProduct = async (options: {
  name: string
  description?: string
  type?: 'PHYSICAL' | 'DIGITAL' | 'SERVICE'
}): Promise<{ id: string }> => {
  try {
    const product = await apiRequest<{ id: string }>('/v1/catalogs/products', {
      method: 'POST',
      body: {
        name: options.name,
        description: options.description,
        type: options.type ?? 'SERVICE',
        category: 'SOFTWARE',
      },
    })
    return { id: product.id }
  } catch (error) {
    logger.error(`Error creating PayPal product:`, error)
    throw error
  }
}

/**
 * Creates a PayPal billing plan (`/v1/billing/plans`, `P-...`) — the
 * PRICE-level object a subscription is started with. A plan MUST exist
 * before a subscription can be created for it; create plans ahead of time
 * (dashboard or {@link createProduct} + this) and configure your app's plan
 * catalogue with the `P-...` ids.
 *
 * @param options - Plan options.
 * @param options.productId - The parent catalog product id (`PROD-...`).
 * @param options.name - The plan name.
 * @param options.interval - Billing interval unit (`DAY` | `WEEK` | `MONTH` | `YEAR`).
 * @param options.price - The per-cycle price as a decimal string (e.g. `'12.00'`).
 * @param options.currency - ISO currency code (default `USD`).
 * @param options.intervalCount - Interval count (default `1` — e.g. `3` + `MONTH` = quarterly).
 * @returns The created plan id (`P-...`).
 */
export const createPlan = async (options: {
  productId: string
  name: string
  interval: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
  price: string
  currency?: string
  intervalCount?: number
}): Promise<{ id: string }> => {
  try {
    const plan = await apiRequest<{ id: string }>('/v1/billing/plans', {
      method: 'POST',
      body: {
        product_id: options.productId,
        name: options.name,
        billing_cycles: [
          {
            frequency: {
              interval_unit: options.interval,
              interval_count: options.intervalCount ?? 1,
            },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: {
                value: options.price,
                currency_code: options.currency ?? 'USD',
              },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 3,
        },
      },
    })
    return { id: plan.id }
  } catch (error) {
    logger.error(`Error creating PayPal billing plan:`, error)
    throw error
  }
}

/**
 * Retrieves a PayPal billing plan by id. Used to resolve a subscription's
 * `plan_id` to the parent `product_id` for plan-catalogue matching.
 *
 * @param planId - The plan id (`P-...`).
 * @returns The plan object.
 */
export const getPlan = async (planId: string): Promise<PayPalPlan> => {
  try {
    return await apiRequest<PayPalPlan>(`/v1/billing/plans/${encodeURIComponent(planId)}`)
  } catch (error) {
    logger.error(`Error retrieving PayPal billing plan:`, error)
    throw error
  }
}

/**
 * Creates a PayPal billing subscription (`/v1/billing/subscriptions`,
 * `I-...`) for an EXISTING plan and returns the approval URL — the PayPal
 * equivalent of a Stripe Checkout session. The buyer is redirected to
 * `url`; after approving, PayPal returns them to `returnUrl` with
 * `?subscription_id=I-...&ba_token=...&token=...` appended.
 *
 * @param options - Subscription options.
 * @param options.planId - The billing plan id (`P-...`). Must already exist.
 * @param options.returnUrl - URL PayPal returns the buyer to after approval.
 * @param options.cancelUrl - URL PayPal returns the buyer to if they abort.
 * @param options.customId - Optional free-form id stored on the subscription
 *   (used to carry the molecule user id through webhook events).
 * @param options.idempotencyKey - Optional `PayPal-Request-Id` for safe retries.
 * @returns The subscription id and approval URL.
 */
export const createSubscription = async (options: {
  planId: string
  returnUrl: string
  cancelUrl: string
  customId?: string
  idempotencyKey?: string
}): Promise<CheckoutSessionResult> => {
  try {
    const subscription = await apiRequest<PayPalSubscription>('/v1/billing/subscriptions', {
      method: 'POST',
      body: {
        plan_id: options.planId,
        ...(options.customId ? { custom_id: options.customId } : {}),
        application_context: {
          return_url: options.returnUrl,
          cancel_url: options.cancelUrl,
          user_action: 'SUBSCRIBE_NOW',
        },
      },
      headers: options.idempotencyKey ? { 'PayPal-Request-Id': options.idempotencyKey } : {},
    })
    return { id: subscription.id, url: approveUrlFromLinks(subscription.links) }
  } catch (error) {
    logger.error(`Error creating PayPal subscription:`, error)
    throw error
  }
}

/**
 * Retrieves a PayPal billing subscription by id.
 *
 * @param subscriptionId - The subscription id (`I-...`).
 * @returns The subscription object.
 */
export const getSubscription = async (subscriptionId: string): Promise<PayPalSubscription> => {
  try {
    return await apiRequest<PayPalSubscription>(
      `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    )
  } catch (error) {
    logger.error(`Error retrieving PayPal subscription:`, error)
    throw error
  }
}

/**
 * Cancels a PayPal billing subscription. Unlike Stripe's
 * `cancel_at_period_end`, PayPal cancellation is IMMEDIATE — the subscription
 * terminates at once and the buyer is not refunded for the unused remainder
 * of the cycle automatically.
 *
 * @param subscriptionId - The subscription id (`I-...`).
 * @param reason - Optional cancellation reason shown in PayPal.
 * @returns `true` when PayPal acknowledged the cancellation.
 */
export const cancelSubscription = async (
  subscriptionId: string,
  reason?: string,
): Promise<boolean> => {
  try {
    await apiRequest<undefined>(
      `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      { method: 'POST', body: { reason: reason ?? 'Canceled by the subscriber' } },
    )
    return true
  } catch (error) {
    logger.error(`Error canceling PayPal subscription:`, error)
    throw error
  }
}

/**
 * Revises a PayPal billing subscription to a different plan
 * (`/v1/billing/subscriptions/{id}/revise`) — the plan-change analog of
 * updating a Stripe subscription's price. PayPal usually requires the buyer
 * to RE-APPROVE the revised terms, in which case the response carries an
 * `approve` link the buyer must be sent through.
 *
 * @param subscriptionId - The subscription id (`I-...`).
 * @param planId - The new billing plan id (`P-...`).
 * @returns The revised subscription plus the approval URL when re-approval is required.
 */
export const reviseSubscription = async (
  subscriptionId: string,
  planId: string,
): Promise<{ subscription: PayPalSubscription; approveUrl: string | null }> => {
  try {
    const subscription = await apiRequest<PayPalSubscription>(
      `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/revise`,
      { method: 'POST', body: { plan_id: planId } },
    )
    return { subscription, approveUrl: approveUrlFromLinks(subscription.links) }
  } catch (error) {
    logger.error(`Error revising PayPal subscription:`, error)
    throw error
  }
}

/**
 * Creates a PayPal v2 checkout order (`/v2/checkout/orders`) for a ONE-TIME
 * purchase and returns the approval URL. After the buyer approves, PayPal
 * returns them to `returnUrl` with `?token=<orderId>&PayerID=...` appended;
 * the order is then captured server-side (see the bond adapter's
 * `verifySubscription`, which captures an approved order on verify).
 *
 * @param options - Order options.
 * @param options.amount - The amount as a decimal string (e.g. `'12.00'`).
 * @param options.currency - ISO currency code (default `USD`).
 * @param options.referenceId - Optional seller reference stored on the purchase
 *   unit — carry the plan/product id here so verification can map the order
 *   back to your catalogue.
 * @param options.returnUrl - URL PayPal returns the buyer to after approval.
 * @param options.cancelUrl - URL PayPal returns the buyer to if they abort.
 * @param options.customId - Optional free-form id (e.g. the molecule user id).
 * @param options.idempotencyKey - Optional `PayPal-Request-Id` for safe retries.
 * @returns The order id and approval URL.
 */
export const createOrder = async (options: {
  amount: string
  currency?: string
  referenceId?: string
  returnUrl: string
  cancelUrl: string
  customId?: string
  idempotencyKey?: string
}): Promise<CheckoutSessionResult> => {
  try {
    const order = await apiRequest<PayPalOrder>('/v2/checkout/orders', {
      method: 'POST',
      body: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            ...(options.referenceId ? { reference_id: options.referenceId } : {}),
            ...(options.customId ? { custom_id: options.customId } : {}),
            amount: {
              currency_code: options.currency ?? 'USD',
              value: options.amount,
            },
          },
        ],
        application_context: {
          return_url: options.returnUrl,
          cancel_url: options.cancelUrl,
          user_action: 'PAY_NOW',
        },
      },
      headers: options.idempotencyKey ? { 'PayPal-Request-Id': options.idempotencyKey } : {},
    })
    return { id: order.id, url: approveUrlFromLinks(order.links) }
  } catch (error) {
    logger.error(`Error creating PayPal order:`, error)
    throw error
  }
}

/**
 * Retrieves a PayPal v2 checkout order by id.
 *
 * @param orderId - The order id.
 * @returns The order object.
 */
export const getOrder = async (orderId: string): Promise<PayPalOrder> => {
  try {
    return await apiRequest<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`)
  } catch (error) {
    logger.error(`Error retrieving PayPal order:`, error)
    throw error
  }
}

/**
 * Captures an APPROVED PayPal order (`/v2/checkout/orders/{id}/capture`),
 * moving the buyer's approved funds. An order is only capturable after the
 * buyer has approved it; capturing a `CREATED` order fails with
 * `UNPROCESSABLE_ENTITY`.
 *
 * @param orderId - The order id.
 * @returns The captured (usually `COMPLETED`) order.
 */
export const captureOrder = async (orderId: string): Promise<PayPalOrder> => {
  try {
    return await apiRequest<PayPalOrder>(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      { method: 'POST' },
    )
  } catch (error) {
    logger.error(`Error capturing PayPal order:`, error)
    throw error
  }
}

/**
 * Verifies a PayPal webhook's authenticity via PayPal's
 * `/v1/notifications/verify-webhook-signature` endpoint and parses the event
 * payload. Unlike Stripe (local HMAC), PayPal verification is a server call:
 * the transmission headers + raw event + your `PAYPAL_WEBHOOK_ID` are posted
 * back to PayPal, which answers `SUCCESS`/`FAILURE`.
 *
 * @param params - The webhook verification parameters.
 * @param params.authAlgo - The `paypal-auth-algo` header value.
 * @param params.certUrl - The `paypal-cert-url` header value.
 * @param params.transmissionId - The `paypal-transmission-id` header value.
 * @param params.transmissionSig - The `paypal-transmission-sig` header value.
 * @param params.transmissionTime - The `paypal-transmission-time` header value.
 * @param params.webhookEvent - The parsed JSON event body.
 * @returns The parsed event (id, type, resource) when verification succeeds,
 *   or `null` when PayPal reports `FAILURE`.
 * @throws {Error} A tagged config-not-configured error when `PAYPAL_WEBHOOK_ID` is unset.
 */
export const verifyWebhookSignature = async (params: {
  authAlgo: string
  certUrl: string
  transmissionId: string
  transmissionSig: string
  transmissionTime: string
  webhookEvent: Record<string, unknown>
}): Promise<WebhookEventResult | null> => {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) {
    // Same actionable config-missing treatment as getAccessToken(): the error
    // names the exact key + setup URL (from the registered secret definition)
    // so a misconfigured server is distinguishable from a forged signature.
    throw configNotConfiguredError('PAYPAL_WEBHOOK_ID', 'payment webhook verification')
  }
  const result = await apiRequest<{ verification_status?: string }>(
    '/v1/notifications/verify-webhook-signature',
    {
      method: 'POST',
      body: {
        auth_algo: params.authAlgo,
        cert_url: params.certUrl,
        transmission_id: params.transmissionId,
        transmission_sig: params.transmissionSig,
        transmission_time: params.transmissionTime,
        webhook_id: webhookId,
        webhook_event: params.webhookEvent,
      },
    },
  )
  if (result.verification_status !== 'SUCCESS') {
    return null
  }
  return {
    id: typeof params.webhookEvent.id === 'string' ? params.webhookEvent.id : undefined,
    type: typeof params.webhookEvent.event_type === 'string' ? params.webhookEvent.event_type : '',
    resource: (params.webhookEvent.resource ?? {}) as Record<string, unknown>,
  }
}

/**
 * Maps a raw PayPal subscription status string (e.g. `APPROVAL_PENDING`,
 * `SUSPENDED`) to the provider-agnostic `SubscriptionStatus`.
 *
 * Shared between `normalizeSubscription` (verify path) and the webhook adapter so
 * both paths derive status identically. `APPROVED` maps to `pending` on purpose:
 * the buyer has approved the billing agreement but the first payment is NOT
 * confirmed yet — granting on `APPROVED` would confer entitlement without a
 * confirmed payment (the same gate the Google bond's NON_ENTITLED_STATES set
 * enforces). `SUSPENDED` maps to `past_due` because PayPal suspends
 * subscriptions on payment failure.
 *
 * @param rawStatus - The raw PayPal `status` string, or `undefined` if absent.
 * @returns The normalized `SubscriptionStatus` (`'unknown'` for unrecognized/missing).
 */
export const normalizeSubscriptionStatus = (rawStatus: string | undefined): SubscriptionStatus => {
  const statusMap: Record<string, SubscriptionStatus> = {
    APPROVAL_PENDING: 'pending',
    APPROVED: 'pending',
    ACTIVE: 'active',
    SUSPENDED: 'past_due',
    CANCELLED: 'canceled',
    EXPIRED: 'expired',
  }

  return (rawStatus && statusMap[rawStatus]) || 'unknown'
}

/**
 * Normalizes a PayPal `PayPalSubscription` to the common
 * `NormalizedSubscription` interface used across all payment providers.
 *
 * @param subscription - The PayPal subscription to normalize.
 * @param plan - Optional billing plan (from {@link getPlan}); when provided,
 *   `productId` resolves to the plan's parent catalog product id. Without it
 *   `productId` falls back to the plan id — the bond adapter always fetches
 *   the plan so callers get both identifiers.
 * @returns A `NormalizedSubscription` with provider-agnostic fields.
 */
export const normalizeSubscription = (
  subscription: PayPalSubscription,
  plan?: PayPalPlan,
): NormalizedSubscription => {
  const periodStart = subscription.status_update_time ?? subscription.create_time
  const periodEnd = subscription.billing_info?.next_billing_time
  return {
    provider: 'paypal',
    subscriptionId: subscription.id,
    productId: plan?.product_id ?? subscription.plan_id,
    status: normalizeSubscriptionStatus(subscription.status),
    isActive: subscription.status === 'ACTIVE',
    currentPeriodStart: periodStart ? Date.parse(periodStart) : undefined,
    currentPeriodEnd: periodEnd ? Date.parse(periodEnd) : undefined,
    willRenew: subscription.status === 'ACTIVE',
    canceledAt:
      subscription.status === 'CANCELLED' && subscription.status_update_time
        ? Date.parse(subscription.status_update_time)
        : undefined,
    rawData: subscription as unknown as Record<string, unknown>,
  }
}
