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
// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type { NormalizedSubscription, SubscriptionStatus } from '@molecule/api-payments'
import { getProxyAgent } from '@molecule/api-proxy-agent'
import { configNotConfiguredError } from '@molecule/api-secrets'

import type {
  CheckoutSessionResult,
  SubscriptionResult,
  SubscriptionUpdateParams,
  WebhookEventResult,
} from './types.js'

/**
 * The Stripe REST endpoint every request in this bond goes to.
 *
 * Only used to resolve the outbound proxy: the target URL is what decides which
 * proxy variable applies and whether `NO_PROXY` exempts the host, so it has to
 * be the real endpoint rather than a placeholder.
 */
const STRIPE_API_URL = 'https://api.stripe.com'

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
    if (!key) {
      // Tag as a config-missing condition (not an internal error): the API error
      // middleware maps `statusCode` + `errorKey` to a clean 503, and the message
      // carries the registered definition's description + setup URL — the user
      // sees exactly which key to set and where to get it, at the exact moment
      // they're trying to upgrade to a paid plan.
      throw configNotConfiguredError('STRIPE_SECRET_KEY', 'payments')
    }
    // The Stripe SDK builds its own `https.Agent` and does NOT read
    // HTTPS_PROXY/NO_PROXY — `NODE_USE_ENV_PROXY` does not reach it either,
    // because it never goes through Node's proxy-aware paths. On a workstation
    // that direct dial to api.stripe.com succeeds, so the gap is invisible; in
    // an environment whose only egress path is a proxy (a molecule.dev sandbox,
    // a deployed molecule.dev app) every call failed with a bare connection
    // error. `httpAgent` is the SDK's own hook for exactly this. Undefined when
    // no proxy is configured, so a standalone app is unaffected.
    const httpAgent = getProxyAgent(STRIPE_API_URL)
    // Bound each request: Stripe's SDK default is an 80s timeout with automatic
    // retries, so a Stripe slowdown during a signup/upgrade surge would pin
    // request workers for over a minute each and cascade into a pool/worker
    // exhaustion outage. Cap at 15s with two retries.
    _client = new Stripe(key, {
      timeout: 15_000,
      maxNetworkRetries: 2,
      ...(httpAgent ? { httpAgent } : {}),
    })
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
    customer: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
    items: {
      data: sub.items.data.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price
          ? {
              // The PRICE id is load-bearing for plan resolution: apps
              // register their catalogue by the env-configured price ids,
              // while `product` is the parent product — keep both.
              id: item.price.id,
              product: typeof item.price.product === 'string' ? item.price.product : undefined,
            }
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
 * @param options.clientReferenceId - Your own id for the buyer (the app's user
 *   id). Stripe echoes it back as `client_reference_id` on the session and on
 *   every `checkout.session.*` webhook event, which is how the customer
 *   (`cus_…`) created by this checkout gets linked to the account that paid.
 *   Always pass it: without it the first purchase has nothing tying the new
 *   Stripe customer to a user.
 * @param options.metadata - Optional key-value metadata to attach to the session
 *   AND to the subscription it creates. Both, deliberately: see below.
 * @param options.idempotencyKey - Optional idempotency key for safe request retries.
 * @param options.quantity - Units of `priceId` to bill — seats, on a per-seat
 *   plan. Defaults to 1, which is right for every flat-priced plan. Clamped to
 *   a whole number >= 1: Stripe rejects 0 and fractions, and a caller that
 *   computed a seat count from a bad read must not turn that into a free
 *   subscription.
 * @returns The checkout session ID and URL.
 */
export const createCheckoutSession = async (options: {
  priceId: string
  quantity?: number
  successUrl: string
  cancelUrl: string
  customerId?: string
  clientReferenceId?: string
  metadata?: Record<string, string>
  idempotencyKey?: string
}): Promise<CheckoutSessionResult> => {
  try {
    const session = await getClient().checkout.sessions.create(
      {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: options.priceId,
            quantity: Math.max(1, Math.floor(options.quantity ?? 1)),
          },
        ],
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        customer: options.customerId,
        client_reference_id: options.clientReferenceId,
        metadata: options.metadata,
        // The SAME metadata on the subscription this session creates. Stripe
        // does not copy a session's metadata onto its subscription, and the
        // difference is not cosmetic: `customer.subscription.created` fires
        // BEFORE `checkout.session.completed`, carries no
        // `client_reference_id`, and — on a first purchase — names a `cus_…`
        // the app has never seen. So the one event that reports what was
        // actually billed (`items.data[].quantity`, i.e. SEATS) arrives with
        // nothing tying it to a user, and a webhook that syncs seat counts
        // silently drops the first one. A buyer pays for three seats and the
        // product gives them one.
        subscription_data: options.metadata ? { metadata: options.metadata } : undefined,
      },
      options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
    )

    return { id: session.id, url: session.url }
  } catch (error) {
    logger.error(`Error creating Stripe checkout session:`, error)
    throw error
  }
}

/**
 * Creates a Stripe Billing Portal session so the user can manage their
 * subscription (update payment method, cancel, view invoices) in Stripe's
 * hosted portal.
 *
 * @param options - Portal configuration.
 * @param options.customerId - The Stripe Customer ID to open the portal for.
 * @param options.returnUrl - URL Stripe returns the user to when they exit
 *   the portal. Falls back to APP_ORIGIN/ORIGIN when omitted.
 * @returns The portal session ID and URL, or `null` when Stripe rejects the
 *   request (e.g. unknown customer).
 */
export const createPortalSession = async (options: {
  customerId: string
  returnUrl?: string
}): Promise<{ id: string; url: string } | null> => {
  try {
    const returnUrl = options.returnUrl ?? process.env.APP_ORIGIN ?? process.env.ORIGIN ?? undefined
    const session = await getClient().billingPortal.sessions.create({
      customer: options.customerId,
      return_url: returnUrl,
    })
    return { id: session.id, url: session.url }
  } catch (error) {
    logger.error(`Error creating Stripe billing portal session:`, error)
    return null
  }
}

/**
 * Retrieves a Stripe Checkout session by ID, including the associated subscription.
 *
 * @param sessionId - The Stripe Checkout session ID.
 * @returns The session ID, URL, and subscription ID (if a subscription was created).
 */
export const getCheckoutSession = async (sessionId: string): Promise<CheckoutSessionResult> => {
  try {
    const session = await getClient().checkout.sessions.retrieve(sessionId)
    const subscription =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as { id?: string } | null)?.id
    return { id: session.id, url: session.url, subscription }
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
    // Same actionable config-missing treatment as getClient(): the error names
    // the exact key + setup URL (from the registered secret definition) so a
    // misconfigured server is distinguishable from a forged/bad signature —
    // "Missing Stripe webhook secret" read like a request-parsing bug and sent
    // integrators debugging their webhook wiring instead of their .env.
    throw configNotConfiguredError('STRIPE_WEBHOOK_SECRET', 'payment webhook verification')
  }
  const event = getClient().webhooks.constructEvent(payload, signature, webhookSecret)
  return {
    type: event.type,
    data: { object: event.data.object as unknown as Record<string, unknown> },
  }
}

/**
 * Creates a Stripe SetupIntent for the saved-card flow.
 *
 * If `customerId` is not provided, a new Stripe customer is created and its
 * ID is returned alongside the SetupIntent so the resource layer can persist
 * the customer ID for future SetupIntents and detachments.
 *
 * @param options - SetupIntent creation options.
 * @param options.customerId - Optional existing Stripe customer ID (`cus_...`).
 * @param options.metadata - Optional metadata to attach to the SetupIntent.
 * @param options.idempotencyKey - Optional idempotency key for safe retries.
 * @returns The SetupIntent ID, client secret, and customer ID.
 */
export const createSetupIntent = async (options: {
  customerId?: string
  metadata?: Record<string, string>
  idempotencyKey?: string
}): Promise<{ id: string; clientSecret: string; customerId: string }> => {
  try {
    const client = getClient()
    let customerId = options.customerId
    if (!customerId) {
      const customer = await client.customers.create(
        { metadata: options.metadata },
        options.idempotencyKey
          ? { idempotencyKey: `${options.idempotencyKey}:customer` }
          : undefined,
      )
      customerId = customer.id
    }
    const setupIntent = await client.setupIntents.create(
      {
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: options.metadata,
      },
      options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
    )
    if (!setupIntent.client_secret) {
      throw new Error('Stripe SetupIntent missing client_secret')
    }
    return {
      id: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      customerId,
    }
  } catch (error) {
    logger.error('Error creating Stripe SetupIntent:', error)
    throw error
  }
}

/**
 * Retrieves a saved Stripe payment method (card) and returns normalized metadata.
 *
 * @param paymentMethodId - The Stripe payment method ID (`pm_...`).
 * @returns Brand, last4, and expiry, or `null` if the lookup fails.
 */
export const retrievePaymentMethod = async (
  paymentMethodId: string,
): Promise<{
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
} | null> => {
  try {
    const pm = await getClient().paymentMethods.retrieve(paymentMethodId)
    if (!pm.card) return null
    return {
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    }
  } catch (error) {
    logger.error('Error retrieving Stripe payment method:', error)
    return null
  }
}

/**
 * Detaches a saved Stripe payment method from its customer.
 *
 * @param paymentMethodId - The Stripe payment method ID (`pm_...`).
 * @returns `true` if Stripe acknowledged the detach, `false` otherwise.
 */
export const detachPaymentMethod = async (paymentMethodId: string): Promise<boolean> => {
  try {
    await getClient().paymentMethods.detach(paymentMethodId)
    return true
  } catch (error) {
    logger.error('Error detaching Stripe payment method:', error)
    return false
  }
}

/**
 * Reports a usage-based OVERAGE charge to Stripe as a one-off invoice item
 * against an existing customer (and, when given, attached to the open invoice
 * of a specific subscription so it lands on the next cycle invoice).
 *
 * This is the supported, type-safe path on the installed Stripe SDK (v22):
 * the legacy `subscriptionItems.createUsageRecord` API was removed in favor of
 * metered-price meter events / invoice items. A positive-amount invoice item
 * is the simplest cost-plus overage mechanism — Stripe aggregates open invoice
 * items and bills them at the customer's cycle close, so repeated incremental
 * calls accrete onto the same upcoming invoice.
 *
 * IDEMPOTENCY: the caller MUST pass a stable `idempotencyKey` derived from
 * `(user, period, amount)` so a retry or a double-run within the same Stripe
 * idempotency window (24h) is collapsed to a single invoice item and never
 * double-charges (broker safety invariant 4).
 *
 * This function performs NO gating of its own — it charges whatever it is
 * told to. The decision of WHETHER to charge (configured? opted-in? paid?
 * over budget?) lives entirely in the molecule-dev billing module, which is
 * the single inert/opt-in gate (safety invariants 1 + 2).
 *
 * @param options - Overage reporting options.
 * @param options.customerId - The Stripe customer to bill (`cus_...`).
 * @param options.amountCents - The overage amount in cents (must be `> 0`).
 * @param options.currency - ISO currency (defaults to `usd`).
 * @param options.priceId - The metered/overage Price id this reports against;
 *   recorded in metadata for reconciliation (the invoice item carries an
 *   explicit `amount`, so the price's unit amount is not used here).
 * @param options.subscriptionId - Optional subscription to attach the item to
 *   so it bills on that subscription's cycle invoice.
 * @param options.description - Human-readable line description.
 * @param options.metadata - Extra reconciliation metadata (e.g. period).
 * @param options.idempotencyKey - REQUIRED stable key (see IDEMPOTENCY above).
 * @returns The created invoice item id + the amount actually reported.
 */
export const reportUsageOverage = async (options: {
  customerId: string
  amountCents: number
  currency?: string
  priceId: string
  subscriptionId?: string
  description?: string
  metadata?: Record<string, string>
  idempotencyKey: string
}): Promise<{ id: string; amountCents: number }> => {
  try {
    const invoiceItem = await getClient().invoiceItems.create(
      {
        customer: options.customerId,
        amount: Math.round(options.amountCents),
        currency: options.currency ?? 'usd',
        description: options.description,
        ...(options.subscriptionId ? { subscription: options.subscriptionId } : {}),
        metadata: { ...options.metadata, overagePriceId: options.priceId },
      },
      { idempotencyKey: options.idempotencyKey },
    )
    return { id: invoiceItem.id, amountCents: invoiceItem.amount }
  } catch (error) {
    // Never log the customer id or amounts at error level beyond the bare fact.
    logger.error('Error reporting Stripe usage overage:', error)
    throw error
  }
}

/**
 * Charges a customer's saved card OFF-SESSION for a fixed amount — the
 * PREPAID top-up primitive (the customer is not present to authenticate).
 *
 * Distinct from {@link reportUsageOverage} in the property that matters:
 * `reportUsageOverage` records an amount to be collected LATER on an invoice,
 * so the money is a receivable until the cycle closes. This CAPTURES the money
 * now and reports whether it actually settled, which is what makes a prepaid
 * balance prepaid. Only credit a balance on `status: 'succeeded'`.
 *
 * A saved card is required: the charge uses the customer's `invoice_settings.
 * default_payment_method`, falling back to their most recent attached card.
 * With `off_session: true` + `confirm: true`, Stripe either settles the payment
 * or fails — it never returns a client-side flow the absent customer could
 * complete. A card that demands 3DS therefore surfaces as
 * `status: 'requires_action'`, which callers MUST treat as a failure and
 * resolve by asking the customer to re-authenticate on-session.
 *
 * IDEMPOTENCY: the caller MUST pass a stable `idempotencyKey`. A retry inside
 * Stripe's 24h idempotency window returns the ORIGINAL PaymentIntent rather
 * than charging again — the property that makes an auto-refill retry safe.
 *
 * This function performs NO gating of its own — it charges what it is told to.
 * Whether a top-up is permitted (balance low? refill cap? velocity?) is the
 * consuming application's decision.
 *
 * @param options - Off-session charge options.
 * @param options.customerId - The Stripe customer to charge (`cus_...`).
 * @param options.amountCents - The amount to capture in cents (must be `> 0`).
 * @param options.currency - ISO currency (defaults to `usd`).
 * @param options.paymentMethodId - Explicit payment method; defaults to the
 *   customer's default card, then their most recently attached card.
 * @param options.description - Human-readable statement/line description.
 * @param options.metadata - Reconciliation metadata (e.g. userId, period).
 * @param options.idempotencyKey - REQUIRED stable key (see IDEMPOTENCY above).
 * @returns The PaymentIntent id, the normalized outcome, the amount actually
 *   captured (0 unless settled), and a decline code/reason when it did not.
 */
export const chargeOffSession = async (options: {
  customerId: string
  amountCents: number
  currency?: string
  paymentMethodId?: string
  description?: string
  metadata?: Record<string, string>
  idempotencyKey: string
}): Promise<{
  id: string | null
  status: 'succeeded' | 'requires_action' | 'failed'
  amountCents: number
  declineCode?: string
  failureMessage?: string
}> => {
  const amount = Math.round(options.amountCents)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('chargeOffSession requires a positive amountCents')
  }
  const client = getClient()

  // Resolve the card to charge. Off-session confirmation cannot prompt the
  // customer to pick one, so an unresolvable payment method is a failure to
  // report — never an implicit "charge whatever Stripe finds".
  let paymentMethodId = options.paymentMethodId
  if (!paymentMethodId) {
    try {
      const customer = await client.customers.retrieve(options.customerId)
      if (!customer.deleted) {
        const defaultPm = customer.invoice_settings?.default_payment_method
        paymentMethodId = typeof defaultPm === 'string' ? defaultPm : (defaultPm?.id ?? undefined)
      }
    } catch (error) {
      logger.error('Error resolving Stripe default payment method:', error)
    }
  }
  if (!paymentMethodId) {
    const methods = await client.paymentMethods.list({
      customer: options.customerId,
      type: 'card',
      limit: 1,
    })
    paymentMethodId = methods.data[0]?.id
  }
  if (!paymentMethodId) {
    return {
      id: null,
      status: 'failed',
      amountCents: 0,
      failureMessage: 'No saved card on file for this customer.',
    }
  }

  try {
    const intent = await client.paymentIntents.create(
      {
        customer: options.customerId,
        amount,
        currency: options.currency ?? 'usd',
        payment_method: paymentMethodId,
        // The absent-customer contract: confirm immediately, and never hand
        // back a redirect/next-action the customer is not there to complete.
        off_session: true,
        confirm: true,
        automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
        description: options.description,
        metadata: options.metadata,
      },
      { idempotencyKey: options.idempotencyKey },
    )
    if (intent.status === 'succeeded') {
      return { id: intent.id, status: 'succeeded', amountCents: intent.amount_received || amount }
    }
    // Anything short of settled is NOT money: report it as such so the caller
    // cannot mistake an authentication prompt for a captured payment.
    return {
      id: intent.id,
      status: intent.status === 'requires_action' ? 'requires_action' : 'failed',
      amountCents: 0,
      failureMessage: intent.last_payment_error?.message,
      ...(intent.last_payment_error?.decline_code
        ? { declineCode: intent.last_payment_error.decline_code }
        : {}),
    }
  } catch (error) {
    // A declined off-session charge arrives as a thrown StripeCardError whose
    // payload carries the intent — a normal, expected outcome (an expired or
    // insufficient-funds card), so it is reported, not re-thrown.
    if (error instanceof Stripe.errors.StripeCardError) {
      const intent = error.payment_intent
      logger.warn('Stripe off-session charge declined', {
        code: error.code,
        declineCode: error.decline_code,
      })
      return {
        id: intent?.id ?? null,
        status: intent?.status === 'requires_action' ? 'requires_action' : 'failed',
        amountCents: 0,
        ...(error.decline_code ? { declineCode: error.decline_code } : {}),
        failureMessage: error.message,
      }
    }
    // Never log the customer id or amount beyond the bare fact of failure.
    logger.error('Error creating Stripe off-session charge:', error)
    throw error
  }
}

/**
 * Maps a raw Stripe subscription status string (e.g. `past_due`, `incomplete`)
 * to the provider-agnostic `SubscriptionStatus`.
 *
 * Shared between `normalizeSubscription` (verify path) and the webhook adapter so
 * both paths derive status identically.
 * @param rawStatus - The raw Stripe `status` string, or `undefined` if absent.
 * @returns The normalized `SubscriptionStatus` (`'unknown'` for unrecognized/missing).
 */
export const normalizeSubscriptionStatus = (rawStatus: string | undefined): SubscriptionStatus => {
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

  return (rawStatus && statusMap[rawStatus]) || 'unknown'
}

/**
 * Normalizes a Stripe-specific `SubscriptionResult` to the common
 * `NormalizedSubscription` interface used across all payment providers.
 *
 * @param subscription - The Stripe subscription result to normalize.
 * @returns A `NormalizedSubscription` with provider-agnostic fields.
 */
export const normalizeSubscription = (subscription: SubscriptionResult): NormalizedSubscription => {
  return {
    provider: 'stripe',
    subscriptionId: subscription.id,
    productId: (subscription.items.data[0]?.price?.product as string) || '',
    status: normalizeSubscriptionStatus(subscription.status),
    isActive: subscription.status === 'active' || subscription.status === 'trialing',
    currentPeriodStart: subscription.current_period_start * 1000,
    currentPeriodEnd: subscription.current_period_end * 1000,
    willRenew: !subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? subscription.canceled_at * 1000 : undefined,
    rawData: subscription as unknown as Record<string, unknown>,
  }
}
