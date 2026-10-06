/**
 * Payments capture provider for molecule.dev.
 *
 * Implements {@link PaymentProviderInterface} against an in-memory ledger
 * instead of a vendor API: checkouts complete, subscriptions activate, renew,
 * fail and cancel, refunds are recorded, and signed webhook requests can be
 * built for local delivery. It never opens a network connection.
 *
 * @module
 */

import {
  type CreateSetupIntentParams,
  type PaymentProviderInterface,
  type ProviderPaymentMethod,
  resolveBillingPortalReturnUrl,
  resolveCheckoutRedirectUrls,
  type SetupIntentResult,
  type SubscriptionUpdateResult,
  type VerifiedSubscription,
  type WebhookEvent,
} from '@molecule/api-payments'

import { PaymentsCaptureError } from './errors.js'
import { defaultPaymentsCaptureLedger } from './ledger.js'
import type {
  BuildWebhookRequestInput,
  CaptureCardInput,
  CapturedCheckoutSession,
  CapturedOperation,
  CapturedPaymentMethod,
  CapturedRefund,
  CapturedSubscription,
  CaptureInterval,
  CapturePrice,
  CaptureRefundInput,
  CaptureWebhookRequest,
  PaymentsCaptureOptions,
  PaymentsCaptureProvider,
} from './types.js'
import {
  CAPTURE_SIGNATURE_HEADER,
  DEFAULT_CAPTURE_WEBHOOK_SECRET,
  parseCaptureWebhookEvent,
  signCaptureWebhookPayload,
  verifyCaptureWebhookSignature,
} from './webhook.js'

/** The placeholder a hosted checkout substitutes its session id into. */
const SESSION_ID_TOKEN = '{CHECKOUT_SESSION_ID}'

/** Window in which a repeated identical checkout request reuses the open session (Stripe bond: 5 min). */
const CHECKOUT_REUSE_WINDOW_MS = 5 * 60 * 1000

/**
 * Reads an environment variable without assuming a `process` global exists.
 *
 * @param name - Variable name.
 * @returns Its value, or `undefined`.
 */
const readEnv = (name: string): string | undefined =>
  typeof process === 'undefined' ? undefined : process.env?.[name] || undefined

/**
 * Adds one billing interval to a Unix-seconds timestamp (calendar months and
 * years, like a real vendor).
 *
 * @param startSeconds - Period start (Unix seconds).
 * @param interval - Billing interval.
 * @returns Period end (Unix seconds).
 */
const addInterval = (startSeconds: number, interval: CaptureInterval): number => {
  const date = new Date(startSeconds * 1000)
  if (interval === 'day') date.setUTCDate(date.getUTCDate() + 1)
  else if (interval === 'week') date.setUTCDate(date.getUTCDate() + 7)
  else if (interval === 'year') date.setUTCFullYear(date.getUTCFullYear() + 1)
  else date.setUTCMonth(date.getUTCMonth() + 1)
  return Math.floor(date.getTime() / 1000)
}

/**
 * Creates a payments capture provider with its own options.
 *
 * Every provider created without `options.ledger` records into the shared
 * ledger read by `getCapturedPayments()`; pass a `new PaymentsCaptureLedger()`
 * to isolate one (e.g. per test).
 *
 * @param options - Provider name, webhook secret, catalogue, clock, ledger.
 * @returns A provider implementing the whole payments interface plus helpers.
 */
export function createPaymentsCaptureProvider(
  options: PaymentsCaptureOptions = {},
): PaymentsCaptureProvider {
  const ledger = options.ledger ?? defaultPaymentsCaptureLedger
  const records = ledger.records
  const providerName = options.providerName ?? 'stripe'
  const autoComplete = options.autoCompleteCheckout ?? true
  const catalog = options.catalog ?? {}
  const now = options.now ?? Date.now
  const nowSeconds = (): number => Math.floor(now() / 1000)
  const webhookSecret = (): string =>
    options.webhookSecret ??
    readEnv('PAYMENTS_CAPTURE_WEBHOOK_SECRET') ??
    DEFAULT_CAPTURE_WEBHOOK_SECRET

  const log = (method: string, args: unknown, outcome: CapturedOperation['outcome']): void => {
    records.operations.push({ method, args: structuredClone(args), outcome, at: now() })
  }

  const priceOf = (priceId: string): CapturePrice | undefined => catalog[priceId]

  const findSubscription = (id: string): CapturedSubscription | undefined =>
    records.subscriptions.find((sub) => sub.id === id)

  const findSession = (id: string): CapturedCheckoutSession | undefined =>
    records.checkoutSessions.find((session) => session.id === id)

  /**
   * Applies the transition a vendor makes on its own: a subscription set to
   * cancel at period end is canceled once that end has passed.
   *
   * @param sub - The subscription to bring up to date.
   * @returns The same subscription.
   */
  const settle = (sub: CapturedSubscription): CapturedSubscription => {
    if (
      sub.cancelAtPeriodEnd &&
      sub.status !== 'canceled' &&
      nowSeconds() >= sub.currentPeriodEnd
    ) {
      sub.status = 'canceled'
      sub.canceledAt = sub.currentPeriodEnd
    }
    return sub
  }

  const requireSubscription = (id: string): CapturedSubscription => {
    const sub = findSubscription(id)
    if (!sub) {
      throw new PaymentsCaptureError(
        'payments.capture.notFound',
        `No captured subscription with id "${id}".`,
      )
    }
    return settle(sub)
  }

  const latestSubscriptionFor = (userId: string): CapturedSubscription | undefined => {
    for (let i = records.subscriptions.length - 1; i >= 0; i--) {
      if (records.subscriptions[i].userId === userId) return settle(records.subscriptions[i])
    }
    return undefined
  }

  const customerFor = (userId: string, create: boolean): string | undefined => {
    const existing = records.customers.find((customer) => customer.userId === userId)
    if (existing || !create) return existing?.id
    const id = ledger.nextId('cus')
    records.customers.push({ id, userId, createdAt: now() })
    return id
  }

  const expiresAtOf = (sub: CapturedSubscription): string =>
    new Date(sub.currentPeriodEnd * 1000).toISOString()

  const subscriptionObject = (sub: CapturedSubscription): Record<string, unknown> => {
    const price = priceOf(sub.priceId)
    return {
      id: sub.id,
      object: 'subscription',
      customer: sub.customerId,
      status: sub.status,
      cancel_at_period_end: sub.cancelAtPeriodEnd,
      canceled_at: sub.canceledAt,
      current_period_start: sub.currentPeriodStart,
      current_period_end: sub.currentPeriodEnd,
      start_date: Math.floor(sub.createdAt / 1000),
      livemode: false,
      metadata: { userId: sub.userId },
      items: {
        object: 'list',
        data: [
          {
            id: sub.itemId,
            object: 'subscription_item',
            quantity: sub.quantity,
            current_period_start: sub.currentPeriodStart,
            current_period_end: sub.currentPeriodEnd,
            price: {
              id: sub.priceId,
              object: 'price',
              product: sub.productId,
              unit_amount: price?.unitAmount ?? null,
              currency: price?.currency ?? 'usd',
              recurring: { interval: price?.interval ?? 'month' },
            },
          },
        ],
      },
    }
  }

  const sessionObject = (session: CapturedCheckoutSession): Record<string, unknown> => ({
    id: session.id,
    object: 'checkout.session',
    mode: 'subscription',
    status: session.status,
    payment_status: session.status === 'complete' ? 'paid' : 'unpaid',
    customer: session.customerId,
    subscription: session.subscriptionId ?? null,
    client_reference_id: session.userId,
    metadata: { userId: session.userId },
    url: session.url,
    success_url: session.successUrl,
    cancel_url: session.cancelUrl,
    created: Math.floor(session.createdAt / 1000),
    livemode: false,
  })

  const completeCheckout = (
    sessionId: string,
    completeOptions: { outcome?: 'paid' | 'declined' } = {},
  ): CapturedCheckoutSession => {
    const session = findSession(sessionId)
    if (!session) {
      throw new PaymentsCaptureError(
        'payments.capture.notFound',
        `No captured checkout session with id "${sessionId}".`,
      )
    }
    if (session.status !== 'open') {
      throw new PaymentsCaptureError(
        'payments.capture.invalidState',
        `Checkout session "${sessionId}" is already ${session.status}.`,
      )
    }
    if (completeOptions.outcome === 'declined') {
      session.status = 'expired'
      return structuredClone(session)
    }
    const start = nowSeconds()
    const sub: CapturedSubscription = {
      id: ledger.nextId('sub'),
      itemId: ledger.nextId('si'),
      customerId: session.customerId,
      userId: session.userId,
      priceId: session.priceId,
      productId: session.productId,
      quantity: session.quantity,
      status: 'active',
      currentPeriodStart: start,
      currentPeriodEnd: addInterval(start, priceOf(session.priceId)?.interval ?? 'month'),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      createdAt: now(),
    }
    records.subscriptions.push(sub)
    session.status = 'complete'
    session.subscriptionId = sub.id
    return structuredClone(session)
  }

  const refuse = async (method: string, args: unknown, why: string): Promise<never> => {
    log(method, args, 'refused')
    throw new PaymentsCaptureError(
      'payments.capture.unsupported',
      `${method} is not simulated by @molecule/api-payments-capture: ${why}`,
    )
  }

  const captureProvider: PaymentsCaptureProvider = {
    providerName,
    verifyFlow: 'subscription',
    notificationFlow: 'webhook',
    isCapture: true,
    ledger,

    get webhookSecret(): string {
      return webhookSecret()
    },

    async verifySubscription(subscriptionId: string): Promise<VerifiedSubscription | null> {
      const viaCheckoutSession = subscriptionId.startsWith('cs_')
      let resolvedId = subscriptionId
      if (viaCheckoutSession) {
        const session = findSession(subscriptionId)
        if (!session?.subscriptionId) {
          log('verifySubscription', { subscriptionId }, 'null')
          return null
        }
        resolvedId = session.subscriptionId
      }

      const found = findSubscription(resolvedId)
      const sub = found ? settle(found) : undefined
      // Same gate as the Stripe bond: only an active/trialing subscription
      // whose period has not elapsed confers entitlement.
      if (
        !sub ||
        (sub.status !== 'active' && sub.status !== 'trialing') ||
        sub.currentPeriodEnd * 1000 <= now()
      ) {
        log('verifySubscription', { subscriptionId }, 'null')
        return null
      }

      log('verifySubscription', { subscriptionId }, 'ok')
      return {
        productId: sub.productId,
        priceId: sub.priceId,
        transactionId: sub.id,
        expiresAt: expiresAtOf(sub),
        autoRenews: !sub.cancelAtPeriodEnd,
        data: { customerId: sub.customerId, subscriptionId: sub.id, viaCheckoutSession },
      }
    },

    async verifyReceipt(_receipt: string, productId: string): Promise<VerifiedSubscription | null> {
      return refuse(
        'verifyReceipt',
        { productId },
        'App Store receipts are signed by Apple and cannot be verified offline. This provider simulates a hosted-checkout vendor (verifyFlow "subscription").',
      )
    },

    async verifyPurchase(
      _receipt: string,
      productId: string,
    ): Promise<VerifiedSubscription | null> {
      return refuse(
        'verifyPurchase',
        { productId },
        'Google Play purchase tokens are issued by Google and cannot be verified offline. This provider simulates a hosted-checkout vendor (verifyFlow "subscription").',
      )
    },

    async parseNotification(body: unknown): Promise<null> {
      return refuse(
        'parseNotification',
        { bodyType: typeof body },
        'server-to-server store notifications come from Apple/Google. This provider delivers signed webhooks instead (notificationFlow "webhook") — use handleWebhookEvent.',
      )
    },

    async handleWebhookEvent(req: unknown): Promise<WebhookEvent | null> {
      const request = (req ?? {}) as {
        body?: unknown
        rawBody?: unknown
        headers?: Record<string, string | string[] | undefined>
      }
      const rawSource = request.rawBody || request.body
      const rawBody =
        typeof rawSource === 'string'
          ? rawSource
          : rawSource instanceof Uint8Array
            ? new TextDecoder().decode(rawSource)
            : ''
      const headerValue = request.headers?.[CAPTURE_SIGNATURE_HEADER]
      const signature = Array.isArray(headerValue) ? headerValue[0] : headerValue

      const reject = (type?: string, eventId?: string): null => {
        records.webhookDeliveries.push({
          verified: false,
          type,
          eventId,
          result: null,
          receivedAt: now(),
        })
        log('handleWebhookEvent', { signed: !!signature }, 'null')
        return null
      }

      // A parsed object (not the raw bytes) cannot be verified — same as the
      // Stripe bond, which hashes the exact body.
      if (!rawBody || !signature) return reject()
      if (
        !verifyCaptureWebhookSignature(rawBody, signature, webhookSecret(), {
          toleranceSeconds: options.webhookToleranceSeconds,
          now: now(),
        })
      ) {
        return reject()
      }

      let event: { id?: string; type?: unknown; data?: { object?: Record<string, unknown> } }
      try {
        event = JSON.parse(rawBody) as typeof event
      } catch (_error) {
        // A correctly signed body that is not JSON is not an event; reporting
        // `null` is the handler's documented rejection, and the delivery is
        // recorded in the ledger for inspection.
        return reject()
      }
      if (typeof event?.type !== 'string') return reject(undefined, event?.id)

      const result = parseCaptureWebhookEvent({ type: event.type, data: event.data })
      records.webhookDeliveries.push({
        verified: true,
        type: event.type,
        eventId: event.id,
        result,
        receivedAt: now(),
      })
      log('handleWebhookEvent', { type: event.type }, 'ok')
      return result
    },

    async updateSubscription(params: {
      userId: string
      newProductId: string
      previousProductId?: string
      quantity?: number
    }): Promise<SubscriptionUpdateResult> {
      const quantity = Math.max(1, Math.floor(params.quantity ?? 1))
      const priceId = params.newProductId
      if (!priceId || (options.strictCatalog && !priceOf(priceId))) {
        log('updateSubscription', params, 'error')
        return { updated: false }
      }
      const productId = priceOf(priceId)?.productId ?? priceId

      const existing = latestSubscriptionFor(params.userId)
      if (existing) {
        // Mirrors the Stripe bond: a subscription with a failed or missing
        // payment cannot change plan (that would grant the plan unpaid), and is
        // not sent to a second checkout either.
        if (!['active', 'trialing', 'canceled', 'incomplete_expired'].includes(existing.status)) {
          log('updateSubscription', params, 'error')
          return { updated: false }
        }
        if (existing.status === 'active' || existing.status === 'trialing') {
          existing.priceId = priceId
          existing.productId = productId
          existing.quantity = quantity
          log('updateSubscription', params, 'ok')
          return {
            updated: true,
            subscription: {
              expiresAt: expiresAtOf(existing),
              autoRenews: !existing.cancelAtPeriodEnd,
            },
          }
        }
      }

      // No live subscription: start a checkout. A repeat of the same request
      // within five minutes gets the same open session (the Stripe bond's
      // idempotency key does the same).
      const reusable = records.checkoutSessions.find(
        (session) =>
          session.status === 'open' &&
          session.userId === params.userId &&
          session.priceId === priceId &&
          session.quantity === quantity &&
          now() - session.createdAt < CHECKOUT_REUSE_WINDOW_MS,
      )
      if (reusable) {
        log('updateSubscription', params, 'ok')
        return { updated: false, checkoutUrl: reusable.url }
      }

      const sessionId = ledger.nextId('cs')
      const redirects = resolveCheckoutRedirectUrls({
        provider: providerName,
        sessionIdToken: SESSION_ID_TOKEN,
      })
      const successUrl = redirects.successUrl.split(SESSION_ID_TOKEN).join(sessionId)
      const customerId = customerFor(params.userId, true) as string
      records.checkoutSessions.push({
        id: sessionId,
        userId: params.userId,
        customerId,
        priceId,
        productId,
        quantity,
        status: 'open',
        // There is no hosted payment page: the buyer goes straight to the
        // app's return page, as they would after paying.
        url: successUrl,
        successUrl,
        cancelUrl: redirects.cancelUrl,
        createdAt: now(),
      })
      if (autoComplete) completeCheckout(sessionId)

      log('updateSubscription', params, 'ok')
      return { updated: false, checkoutUrl: successUrl }
    },

    async cancelSubscription(params: { userId: string }): Promise<boolean> {
      const sub = latestSubscriptionFor(params.userId)
      if (!sub || sub.status === 'canceled' || sub.status === 'incomplete_expired') {
        log('cancelSubscription', params, 'error')
        return false
      }
      // Like the Stripe bond: cancel at period end, keep access until then.
      sub.cancelAtPeriodEnd = true
      log('cancelSubscription', params, 'ok')
      return true
    },

    async createPortalSession(params: {
      userId: string
      returnUrl?: string
    }): Promise<{ id: string; url: string } | null> {
      const customerId = customerFor(params.userId, false)
      if (!customerId) {
        log('createPortalSession', params, 'null')
        return null
      }
      // There is no hosted portal to send the user to; the URL is the return
      // destination, so the round trip lands straight back in the app.
      const url = params.returnUrl ?? resolveBillingPortalReturnUrl()
      const id = ledger.nextId('bps')
      records.portalSessions.push({ id, userId: params.userId, customerId, url, createdAt: now() })
      log('createPortalSession', params, 'ok')
      return { id, url }
    },

    async createSetupIntent(params: CreateSetupIntentParams): Promise<SetupIntentResult> {
      let customerId = params.customerId
      if (customerId) {
        if (!records.customers.some((customer) => customer.id === customerId)) {
          log('createSetupIntent', params, 'error')
          throw new PaymentsCaptureError(
            'payments.capture.notFound',
            `No captured customer with id "${customerId}".`,
          )
        }
      } else {
        customerId = ledger.nextId('cus')
        records.customers.push({
          id: customerId,
          userId: params.metadata?.userId,
          createdAt: now(),
        })
      }
      const id = ledger.nextId('seti')
      const clientSecret = `${id}_secret_capture`
      records.setupIntents.push({
        id,
        clientSecret,
        customerId,
        status: 'requires_payment_method',
        metadata: { ...(params.metadata ?? {}) },
        createdAt: now(),
      })
      log('createSetupIntent', params, 'ok')
      return { id, clientSecret, customerId }
    },

    async getPaymentMethod(providerPaymentMethodId: string): Promise<ProviderPaymentMethod | null> {
      const method = records.paymentMethods.find((pm) => pm.id === providerPaymentMethodId)
      log('getPaymentMethod', { providerPaymentMethodId }, method ? 'ok' : 'null')
      if (!method) return null
      return {
        id: method.id,
        brand: method.brand,
        last4: method.last4,
        expMonth: method.expMonth,
        expYear: method.expYear,
      }
    },

    async detachPaymentMethod(providerPaymentMethodId: string): Promise<boolean> {
      const method = records.paymentMethods.find((pm) => pm.id === providerPaymentMethodId)
      if (!method || method.customerId === null) {
        log('detachPaymentMethod', { providerPaymentMethodId }, 'error')
        return false
      }
      method.customerId = null
      log('detachPaymentMethod', { providerPaymentMethodId }, 'ok')
      return true
    },

    completeCheckout,

    renewSubscription(subscriptionId: string): CapturedSubscription {
      const sub = requireSubscription(subscriptionId)
      if (sub.status === 'canceled' || sub.status === 'incomplete_expired') {
        throw new PaymentsCaptureError(
          'payments.capture.invalidState',
          `Subscription "${subscriptionId}" is ${sub.status} and cannot renew.`,
        )
      }
      sub.currentPeriodStart = sub.currentPeriodEnd
      sub.currentPeriodEnd = addInterval(
        sub.currentPeriodStart,
        priceOf(sub.priceId)?.interval ?? 'month',
      )
      sub.status = 'active'
      return structuredClone(sub)
    },

    failRenewal(subscriptionId: string): CapturedSubscription {
      const sub = requireSubscription(subscriptionId)
      if (sub.status !== 'active' && sub.status !== 'trialing') {
        throw new PaymentsCaptureError(
          'payments.capture.invalidState',
          `Subscription "${subscriptionId}" is ${sub.status}; only an active subscription can fail a renewal.`,
        )
      }
      // A vendor advances the period when it attempts the renewal, even when
      // the charge fails — the status is what withholds entitlement.
      sub.currentPeriodStart = sub.currentPeriodEnd
      sub.currentPeriodEnd = addInterval(
        sub.currentPeriodStart,
        priceOf(sub.priceId)?.interval ?? 'month',
      )
      sub.status = 'past_due'
      return structuredClone(sub)
    },

    refund(input: CaptureRefundInput): CapturedRefund {
      const sub = requireSubscription(input.subscriptionId)
      const price = priceOf(sub.priceId)
      const cancel = input.cancelSubscription ?? true
      const refundRecord: CapturedRefund = {
        id: ledger.nextId('re'),
        subscriptionId: sub.id,
        amount:
          input.amount ??
          (price?.unitAmount !== undefined ? price.unitAmount * sub.quantity : null),
        currency: price?.currency ?? 'usd',
        reason: input.reason,
        canceledSubscription: cancel,
        createdAt: now(),
      }
      if (cancel && sub.status !== 'canceled') {
        sub.status = 'canceled'
        sub.canceledAt = nowSeconds()
        sub.cancelAtPeriodEnd = false
      }
      records.refunds.push(refundRecord)
      return structuredClone(refundRecord)
    },

    confirmSetupIntent(setupIntentId: string, card: CaptureCardInput = {}): CapturedPaymentMethod {
      const intent = records.setupIntents.find((seti) => seti.id === setupIntentId)
      if (!intent) {
        throw new PaymentsCaptureError(
          'payments.capture.notFound',
          `No captured SetupIntent with id "${setupIntentId}".`,
        )
      }
      if (intent.status !== 'requires_payment_method') {
        throw new PaymentsCaptureError(
          'payments.capture.invalidState',
          `SetupIntent "${setupIntentId}" is already ${intent.status}.`,
        )
      }
      const method: CapturedPaymentMethod = {
        id: ledger.nextId('pm'),
        customerId: intent.customerId,
        brand: card.brand ?? 'visa',
        last4: card.last4 ?? '4242',
        expMonth: card.expMonth ?? 12,
        expYear: card.expYear ?? new Date(now()).getUTCFullYear() + 3,
        createdAt: now(),
      }
      records.paymentMethods.push(method)
      intent.status = 'succeeded'
      intent.paymentMethodId = method.id
      return structuredClone(method)
    },

    buildWebhookRequest(input: BuildWebhookRequestInput): CaptureWebhookRequest {
      let object: Record<string, unknown>
      if (input.subscriptionId) {
        object = subscriptionObject(requireSubscription(input.subscriptionId))
      } else if (input.checkoutSessionId) {
        const session = findSession(input.checkoutSessionId)
        if (!session) {
          throw new PaymentsCaptureError(
            'payments.capture.notFound',
            `No captured checkout session with id "${input.checkoutSessionId}".`,
          )
        }
        object = sessionObject(session)
      } else if (input.object) {
        object = input.object
      } else {
        throw new PaymentsCaptureError(
          'payments.capture.invalidState',
          'buildWebhookRequest needs a subscriptionId, a checkoutSessionId or an explicit object.',
        )
      }

      const signedAt = input.signedAt ?? now()
      const event = {
        id: ledger.nextId('evt'),
        object: 'event',
        created: Math.floor(signedAt / 1000),
        type: input.type,
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        data: { object },
      }
      const rawBody = JSON.stringify(event)
      const signature = signCaptureWebhookPayload(
        rawBody,
        input.secret ?? webhookSecret(),
        Math.floor(signedAt / 1000),
      )
      records.webhookEvents.push({
        id: event.id,
        type: input.type,
        rawBody,
        signature,
        createdAt: now(),
      })
      return {
        rawBody,
        body: rawBody,
        headers: { [CAPTURE_SIGNATURE_HEADER]: signature, 'content-type': 'application/json' },
        event,
      }
    },

    getCaptured() {
      return ledger.snapshot()
    },

    clear() {
      ledger.clear()
    },
  }

  return captureProvider
}

/**
 * Default payments capture provider: named `'stripe'`, auto-completing
 * checkouts, recording into the shared ledger.
 */
export const provider: PaymentsCaptureProvider = createPaymentsCaptureProvider()

/**
 * Alias of {@link provider}, matching the export name of
 * `@molecule/api-payments-stripe` so the bond line swaps by import alone.
 */
export const paymentProvider: PaymentProviderInterface = provider
