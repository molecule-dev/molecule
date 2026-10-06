import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { PaymentProviderInterface } from '@molecule/api-payments'

import { isPaymentsCaptureError, PaymentsCaptureError } from '../errors.js'
import {
  clearCapturedPayments,
  defaultPaymentsCaptureLedger,
  getCapturedPayments,
  PaymentsCaptureLedger,
} from '../ledger.js'
import { createPaymentsCaptureProvider, paymentProvider, provider } from '../provider.js'
import type { PaymentsCaptureOptions, PaymentsCaptureProvider } from '../types.js'
import { DEFAULT_CAPTURE_WEBHOOK_SECRET } from '../webhook.js'

const START = Date.UTC(2026, 0, 15, 12, 0, 0)
const DAY = 24 * 60 * 60 * 1000

let clock = START
let ledger: PaymentsCaptureLedger

const make = (options: PaymentsCaptureOptions = {}): PaymentsCaptureProvider =>
  createPaymentsCaptureProvider({ ledger, now: () => clock, ...options })

/** Every method of the core interface — the contract this bond must cover. */
const INTERFACE_METHODS: Array<keyof PaymentProviderInterface> = [
  'verifySubscription',
  'verifyReceipt',
  'verifyPurchase',
  'handleWebhookEvent',
  'parseNotification',
  'updateSubscription',
  'cancelSubscription',
  'createPortalSession',
  'createSetupIntent',
  'getPaymentMethod',
  'detachPaymentMethod',
]

const savedEnv = { ...process.env }

beforeEach(() => {
  clock = START
  ledger = new PaymentsCaptureLedger()
  process.env.APP_ORIGIN = 'https://app.example.test'
  delete process.env.PAYMENTS_CAPTURE_WEBHOOK_SECRET
  delete process.env.PAYMENTS_PLAN_UPDATED_PATH
})

afterEach(() => {
  process.env = { ...savedEnv }
})

/**
 * Subscribes a user through checkout and returns the subscription id.
 *
 * @param payments - Provider under test.
 * @param userId - App user id.
 * @returns The new subscription id.
 */
const subscribe = async (payments: PaymentsCaptureProvider, userId = 'user-1'): Promise<string> => {
  await payments.updateSubscription!({ userId, newProductId: 'price_pro' })
  const subs = payments.getCaptured().subscriptions.filter((sub) => sub.userId === userId)
  return subs[subs.length - 1].id
}

describe('contract', () => {
  it('implements every method of PaymentProviderInterface', () => {
    const payments = make()
    for (const method of INTERFACE_METHODS) {
      expect(typeof payments[method], method).toBe('function')
    }
    expect(payments.providerName).toBe('stripe')
    expect(payments.verifyFlow).toBe('subscription')
    expect(payments.notificationFlow).toBe('webhook')
    expect(payments.isCapture).toBe(true)
  })

  it('exports a typed default provider and a Stripe-named alias', () => {
    expect(provider.isCapture).toBe(true)
    expect(paymentProvider).toBe(provider)
    expect(provider.ledger).toBe(defaultPaymentsCaptureLedger)
  })

  it('honours a custom provider name in the name and the redirect URL', async () => {
    const payments = make({ providerName: 'capture' })
    const result = await payments.updateSubscription!({ userId: 'u', newProductId: 'price_pro' })
    expect(payments.providerName).toBe('capture')
    expect(result.checkoutUrl).toContain('provider=capture')
  })
})

describe('deterministic ids', () => {
  it('issues the same prefixed sequence from any fresh ledger, and restarts after clear', async () => {
    const run = async (): Promise<string[]> => {
      ledger = new PaymentsCaptureLedger()
      const payments = make()
      await payments.updateSubscription!({ userId: 'u', newProductId: 'price_pro' })
      const snap = payments.getCaptured()
      return [snap.customers[0].id, snap.checkoutSessions[0].id, snap.subscriptions[0].id]
    }
    const first = await run()
    expect(first).toEqual(['cus_capture_000001', 'cs_capture_000001', 'sub_capture_000001'])
    expect(await run()).toEqual(first)

    ledger.nextId('cus')
    ledger.clear()
    expect(ledger.nextId('cus')).toBe('cus_capture_000001')
  })
})

describe('updateSubscription + verifySubscription (checkout)', () => {
  it('creates a checkout returning to the app, completes it, and verifies via cs_ and sub_', async () => {
    const payments = make()
    const result = await payments.updateSubscription!({
      userId: 'user-1',
      newProductId: 'price_pro',
      quantity: 3,
    })
    expect(result).toEqual({
      updated: false,
      checkoutUrl:
        'https://app.example.test/plan-updated?provider=stripe&sessionId=cs_capture_000001',
    })

    const snap = payments.getCaptured()
    expect(snap.checkoutSessions[0]).toMatchObject({
      status: 'complete',
      userId: 'user-1',
      quantity: 3,
      subscriptionId: 'sub_capture_000001',
      cancelUrl: 'https://app.example.test',
    })
    expect(snap.subscriptions[0]).toMatchObject({ status: 'active', quantity: 3 })

    const viaSession = await payments.verifySubscription!('cs_capture_000001')
    expect(viaSession).toEqual({
      productId: 'price_pro',
      priceId: 'price_pro',
      transactionId: 'sub_capture_000001',
      expiresAt: new Date(Date.UTC(2026, 1, 15, 12, 0, 0)).toISOString(),
      autoRenews: true,
      data: {
        customerId: 'cus_capture_000001',
        subscriptionId: 'sub_capture_000001',
        viaCheckoutSession: true,
      },
    })
    const viaSub = await payments.verifySubscription!('sub_capture_000001')
    expect(viaSub?.data).toMatchObject({ viaCheckoutSession: false })
  })

  it('uses the catalogue for product id and interval', async () => {
    const payments = make({
      catalog: { price_y: { productId: 'prod_pro', interval: 'year', unitAmount: 9900 } },
    })
    await payments.updateSubscription!({ userId: 'u', newProductId: 'price_y' })
    const verified = await payments.verifySubscription!('sub_capture_000001')
    expect(verified?.productId).toBe('prod_pro')
    expect(verified?.priceId).toBe('price_y')
    expect(verified?.expiresAt).toBe(new Date(Date.UTC(2027, 0, 15, 12, 0, 0)).toISOString())
  })

  it('rejects an empty price, and an unlisted price under strictCatalog', async () => {
    const payments = make({ strictCatalog: true, catalog: { price_ok: {} } })
    expect(await payments.updateSubscription!({ userId: 'u', newProductId: '' })).toEqual({
      updated: false,
    })
    expect(await payments.updateSubscription!({ userId: 'u', newProductId: 'price_x' })).toEqual({
      updated: false,
    })
    expect(payments.getCaptured().checkoutSessions).toHaveLength(0)
  })

  it('with autoCompleteCheckout false, verify is null until completeCheckout; repeats reuse the session', async () => {
    const payments = make({ autoCompleteCheckout: false })
    const first = await payments.updateSubscription!({ userId: 'u', newProductId: 'price_pro' })
    const repeat = await payments.updateSubscription!({ userId: 'u', newProductId: 'price_pro' })
    expect(repeat.checkoutUrl).toBe(first.checkoutUrl)
    expect(payments.getCaptured().checkoutSessions).toHaveLength(1)

    expect(await payments.verifySubscription!('cs_capture_000001')).toBeNull()
    const session = payments.completeCheckout('cs_capture_000001')
    expect(session.status).toBe('complete')
    expect(await payments.verifySubscription!('cs_capture_000001')).not.toBeNull()

    expect(() => payments.completeCheckout('cs_capture_000001')).toThrow(PaymentsCaptureError)
    expect(() => payments.completeCheckout('cs_nope')).toThrow(/No captured checkout session/)
  })

  it('a declined checkout creates nothing and never verifies', async () => {
    const payments = make({ autoCompleteCheckout: false })
    await payments.updateSubscription!({ userId: 'u', newProductId: 'price_pro' })
    const session = payments.completeCheckout('cs_capture_000001', { outcome: 'declined' })
    expect(session.status).toBe('expired')
    expect(payments.getCaptured().subscriptions).toHaveLength(0)
    expect(await payments.verifySubscription!('cs_capture_000001')).toBeNull()
  })

  it('changes the plan in place for an active subscription', async () => {
    const payments = make()
    await subscribe(payments)
    const result = await payments.updateSubscription!({
      userId: 'user-1',
      newProductId: 'price_team',
      quantity: 5,
    })
    expect(result).toEqual({
      updated: true,
      subscription: {
        expiresAt: new Date(Date.UTC(2026, 1, 15, 12, 0, 0)).toISOString(),
        autoRenews: true,
      },
    })
    const sub = payments.getCaptured().subscriptions[0]
    expect(sub).toMatchObject({ priceId: 'price_team', quantity: 5 })
    expect(payments.getCaptured().checkoutSessions).toHaveLength(1)
  })

  it('refuses a plan change for a past-due subscription without a second checkout', async () => {
    const payments = make()
    const subId = await subscribe(payments)
    payments.failRenewal(subId)
    expect(
      await payments.updateSubscription!({ userId: 'user-1', newProductId: 'price_team' }),
    ).toEqual({ updated: false })
    expect(payments.getCaptured().checkoutSessions).toHaveLength(1)
  })

  it('starts a new checkout once the old subscription is canceled', async () => {
    const payments = make()
    const subId = await subscribe(payments)
    payments.refund({ subscriptionId: subId })
    const result = await payments.updateSubscription!({
      userId: 'user-1',
      newProductId: 'price_pro',
    })
    expect(result.checkoutUrl).toContain('cs_capture_000002')
    expect(payments.getCaptured().subscriptions).toHaveLength(2)
  })

  it('returns null for an unknown id and for an elapsed period', async () => {
    const payments = make()
    expect(await payments.verifySubscription!('sub_unknown')).toBeNull()
    expect(await payments.verifySubscription!('cs_unknown')).toBeNull()
    const subId = await subscribe(payments)
    clock = START + 40 * DAY
    expect(await payments.verifySubscription!(subId)).toBeNull()
    payments.renewSubscription(subId)
    expect(await payments.verifySubscription!(subId)).not.toBeNull()
  })
})

describe('cancelSubscription', () => {
  it('cancels at period end: still verifies until then, canceled after', async () => {
    const payments = make()
    const subId = await subscribe(payments)
    expect(await payments.cancelSubscription!({ userId: 'user-1' })).toBe(true)
    const verified = await payments.verifySubscription!(subId)
    expect(verified?.autoRenews).toBe(false)

    clock = START + 32 * DAY
    expect(await payments.verifySubscription!(subId)).toBeNull()
    expect(payments.getCaptured().subscriptions[0].status).toBe('canceled')
    expect(await payments.cancelSubscription!({ userId: 'user-1' })).toBe(false)
  })

  it('returns false for a user with no subscription', async () => {
    expect(await make().cancelSubscription!({ userId: 'nobody' })).toBe(false)
  })
})

describe('renewals and refunds', () => {
  it('renewSubscription advances one period and clears past_due', async () => {
    const payments = make()
    const subId = await subscribe(payments)
    payments.failRenewal(subId)
    const renewed = payments.renewSubscription(subId)
    expect(renewed.status).toBe('active')
    expect(renewed.currentPeriodEnd).toBe(Date.UTC(2026, 3, 15, 12, 0, 0) / 1000)
  })

  it('failRenewal advances the period but marks past_due, so verify is null', async () => {
    const payments = make()
    const subId = await subscribe(payments)
    const failed = payments.failRenewal(subId)
    expect(failed.status).toBe('past_due')
    expect(failed.currentPeriodEnd).toBe(Date.UTC(2026, 2, 15, 12, 0, 0) / 1000)
    expect(await payments.verifySubscription!(subId)).toBeNull()
    expect(() => payments.failRenewal(subId)).toThrow(/only an active subscription/)
  })

  it('refund records the catalogue amount and cancels by default', async () => {
    const payments = make({ catalog: { price_pro: { unitAmount: 1500, currency: 'eur' } } })
    const subId = await subscribe(payments)
    await payments.updateSubscription!({ userId: 'user-1', newProductId: 'price_pro', quantity: 2 })
    const refund = payments.refund({ subscriptionId: subId, reason: 'requested_by_customer' })
    expect(refund).toMatchObject({
      id: 're_capture_000001',
      amount: 3000,
      currency: 'eur',
      reason: 'requested_by_customer',
      canceledSubscription: true,
    })
    expect(payments.getCaptured().subscriptions[0].status).toBe('canceled')
    expect(await payments.verifySubscription!(subId)).toBeNull()
    expect(() => payments.renewSubscription(subId)).toThrow(/cannot renew/)
  })

  it('refund without cancel keeps the subscription; unknown price amount is null', async () => {
    const payments = make()
    const subId = await subscribe(payments)
    const refund = payments.refund({ subscriptionId: subId, cancelSubscription: false })
    expect(refund.amount).toBeNull()
    expect(payments.getCaptured().subscriptions[0].status).toBe('active')
    expect(() => payments.refund({ subscriptionId: 'sub_nope' })).toThrow(
      expect.objectContaining({ errorKey: 'payments.capture.notFound', statusCode: 404 }),
    )
  })
})

describe('createPortalSession', () => {
  it('returns null without a customer and the return URL with one', async () => {
    const payments = make()
    expect(await payments.createPortalSession!({ userId: 'user-1' })).toBeNull()
    await subscribe(payments)
    expect(
      await payments.createPortalSession!({ userId: 'user-1', returnUrl: 'https://app/billing' }),
    ).toEqual({ id: 'bps_capture_000001', url: 'https://app/billing' })
    expect(await payments.createPortalSession!({ userId: 'user-1' })).toEqual({
      id: 'bps_capture_000002',
      url: 'https://app.example.test',
    })
    expect(payments.getCaptured().portalSessions).toHaveLength(2)
  })
})

describe('saved cards', () => {
  it('createSetupIntent → confirmSetupIntent → getPaymentMethod → detachPaymentMethod', async () => {
    const payments = make()
    const intent = await payments.createSetupIntent!({ metadata: { userId: 'user-1' } })
    expect(intent).toEqual({
      id: 'seti_capture_000001',
      clientSecret: 'seti_capture_000001_secret_capture',
      customerId: 'cus_capture_000001',
    })
    expect(payments.getCaptured().customers[0].userId).toBe('user-1')

    const card = payments.confirmSetupIntent(intent.id, { brand: 'mastercard', last4: '4444' })
    expect(card).toMatchObject({ id: 'pm_capture_000001', customerId: 'cus_capture_000001' })
    expect(() => payments.confirmSetupIntent(intent.id)).toThrow(/already succeeded/)

    expect(await payments.getPaymentMethod!(card.id)).toEqual({
      id: 'pm_capture_000001',
      brand: 'mastercard',
      last4: '4444',
      expMonth: 12,
      expYear: 2029,
    })
    expect(await payments.getPaymentMethod!('pm_unknown')).toBeNull()

    expect(await payments.detachPaymentMethod!(card.id)).toBe(true)
    expect(await payments.detachPaymentMethod!(card.id)).toBe(false)
    expect(await payments.detachPaymentMethod!('pm_unknown')).toBe(false)
    expect(payments.getCaptured().paymentMethods[0].customerId).toBeNull()
  })

  it('reuses a given customer and rejects an unknown one', async () => {
    const payments = make()
    const first = await payments.createSetupIntent!({})
    const second = await payments.createSetupIntent!({ customerId: first.customerId })
    expect(second.customerId).toBe(first.customerId)
    await expect(payments.createSetupIntent!({ customerId: 'cus_nope' })).rejects.toMatchObject({
      errorKey: 'payments.capture.notFound',
    })
    expect(() => payments.confirmSetupIntent('seti_nope')).toThrow(PaymentsCaptureError)
  })
})

describe('refused methods', () => {
  it.each([
    ['verifyReceipt', (p: PaymentsCaptureProvider) => p.verifyReceipt!('receipt', 'prod')],
    ['verifyPurchase', (p: PaymentsCaptureProvider) => p.verifyPurchase!('token', 'prod')],
    ['parseNotification', (p: PaymentsCaptureProvider) => p.parseNotification!({})],
  ])('%s rejects with a typed unsupported error and is logged', async (method, call) => {
    const payments = make()
    const error = await call(payments).then(
      () => null,
      (caught: unknown) => caught,
    )
    expect(isPaymentsCaptureError(error, 'payments.capture.unsupported')).toBe(true)
    expect(error).toMatchObject({ statusCode: 501, name: 'PaymentsCaptureError' })
    expect((error as Error).message).toContain(method)
    expect(payments.getCaptured().operations.at(-1)).toMatchObject({ method, outcome: 'refused' })
  })
})

describe('webhooks: build → handleWebhookEvent round trip', () => {
  it('delivers a signed subscription event in the shape the notification handler reads', async () => {
    const payments = make()
    const subId = await subscribe(payments)
    payments.failRenewal(subId)
    const request = payments.buildWebhookRequest({
      type: 'customer.subscription.updated',
      subscriptionId: subId,
    })
    expect(request.headers['content-type']).toBe('application/json')
    expect(request.headers['stripe-signature']).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/)
    expect(request.event).toMatchObject({ id: 'evt_capture_000001', object: 'event' })

    const event = await payments.handleWebhookEvent!({
      body: { parsed: true },
      rawBody: request.rawBody,
      headers: request.headers,
    })
    expect(event).toEqual({
      type: 'renewed',
      subscription: {
        customerId: 'cus_capture_000001',
        productId: 'price_pro',
        priceId: 'price_pro',
        expiresAt: new Date(Date.UTC(2026, 2, 15, 12, 0, 0)).toISOString(),
        autoRenews: true,
        status: 'past_due',
        isActive: false,
      },
    })
    const snap = payments.getCaptured()
    expect(snap.webhookEvents).toHaveLength(1)
    expect(snap.webhookDeliveries[0]).toMatchObject({
      verified: true,
      type: 'customer.subscription.updated',
      eventId: 'evt_capture_000001',
    })
  })

  it('maps a deletion after refund to "canceled"', async () => {
    const payments = make()
    const subId = await subscribe(payments)
    payments.refund({ subscriptionId: subId })
    const request = payments.buildWebhookRequest({
      type: 'customer.subscription.deleted',
      subscriptionId: subId,
    })
    const event = await payments.handleWebhookEvent!(request)
    expect(event?.type).toBe('canceled')
    expect(event?.subscription).toMatchObject({ status: 'canceled', autoRenews: false })
  })

  it('builds checkout.session events and explicit-object events', async () => {
    const payments = make()
    await subscribe(payments)
    const session = payments.buildWebhookRequest({
      type: 'checkout.session.completed',
      checkoutSessionId: 'cs_capture_000001',
    })
    expect((session.event.data as { object: Record<string, unknown> }).object).toMatchObject({
      client_reference_id: 'user-1',
      subscription: 'sub_capture_000001',
      payment_status: 'paid',
    })
    expect(await payments.handleWebhookEvent!(session)).toEqual({
      type: 'checkout.session.completed',
    })

    const custom = payments.buildWebhookRequest({
      type: 'invoice.paid',
      object: { id: 'in_1' },
    })
    expect(await payments.handleWebhookEvent!(custom)).toEqual({ type: 'invoice.paid' })
    expect(() => payments.buildWebhookRequest({ type: 'x' })).toThrow(/needs a subscriptionId/)
    expect(() => payments.buildWebhookRequest({ type: 'x', subscriptionId: 'sub_no' })).toThrow(
      PaymentsCaptureError,
    )
    expect(() => payments.buildWebhookRequest({ type: 'x', checkoutSessionId: 'cs_no' })).toThrow(
      PaymentsCaptureError,
    )
  })

  it('accepts a Buffer body and an array-valued header', async () => {
    const payments = make()
    const subId = await subscribe(payments)
    const request = payments.buildWebhookRequest({
      type: 'customer.subscription.created',
      subscriptionId: subId,
    })
    const event = await payments.handleWebhookEvent!({
      body: Buffer.from(request.rawBody),
      headers: { 'stripe-signature': [request.headers['stripe-signature']] },
    })
    expect(event?.type).toBe('created')
  })

  it('rejects forged, stale, tampered, unsigned and re-serialized requests', async () => {
    const payments = make()
    const subId = await subscribe(payments)
    const input = { type: 'customer.subscription.updated', subscriptionId: subId }

    const forged = payments.buildWebhookRequest({ ...input, secret: 'whsec_attacker' })
    expect(await payments.handleWebhookEvent!(forged)).toBeNull()

    const stale = payments.buildWebhookRequest({ ...input, signedAt: clock - 10 * 60 * 1000 })
    expect(await payments.handleWebhookEvent!(stale)).toBeNull()

    const good = payments.buildWebhookRequest(input)
    expect(
      await payments.handleWebhookEvent!({
        body: good.rawBody.replace('past_due', 'active').replace('"active"', '"trialing"'),
        headers: good.headers,
      }),
    ).toBeNull()
    expect(await payments.handleWebhookEvent!({ body: good.rawBody, headers: {} })).toBeNull()
    expect(
      await payments.handleWebhookEvent!({ body: JSON.parse(good.rawBody), headers: good.headers }),
    ).toBeNull()
    expect(await payments.handleWebhookEvent!(undefined)).toBeNull()

    const deliveries = payments.getCaptured().webhookDeliveries
    expect(deliveries).toHaveLength(6)
    expect(deliveries.every((delivery) => !delivery.verified && delivery.result === null)).toBe(
      true,
    )
  })

  it('rejects a correctly signed body that is not an event', async () => {
    const payments = make()
    const { signCaptureWebhookPayload } = await import('../webhook.js')
    const t = Math.floor(clock / 1000)
    for (const body of ['not json', JSON.stringify({ no: 'type' })]) {
      const signature = signCaptureWebhookPayload(body, payments.webhookSecret, t)
      expect(
        await payments.handleWebhookEvent!({ body, headers: { 'stripe-signature': signature } }),
      ).toBeNull()
    }
  })

  it('resolves the secret from options, then env, then the dev default', () => {
    expect(make().webhookSecret).toBe(DEFAULT_CAPTURE_WEBHOOK_SECRET)
    process.env.PAYMENTS_CAPTURE_WEBHOOK_SECRET = 'whsec_from_env'
    expect(make().webhookSecret).toBe('whsec_from_env')
    expect(make({ webhookSecret: 'whsec_opt' }).webhookSecret).toBe('whsec_opt')
  })
})

describe('ledger helpers', () => {
  it('records every interface call and returns isolated snapshots', async () => {
    const payments = make()
    await subscribe(payments)
    await payments.verifySubscription!('sub_capture_000001')
    await payments.verifySubscription!('sub_missing')
    const ops = payments.getCaptured().operations.map((op) => [op.method, op.outcome])
    expect(ops).toEqual([
      ['updateSubscription', 'ok'],
      ['verifySubscription', 'ok'],
      ['verifySubscription', 'null'],
    ])

    const snap = payments.getCaptured()
    snap.subscriptions[0].status = 'canceled'
    expect(payments.getCaptured().subscriptions[0].status).toBe('active')

    payments.clear()
    expect(payments.getCaptured().subscriptions).toHaveLength(0)
    expect(payments.getCaptured().operations).toHaveLength(0)
  })

  it('getCapturedPayments / clearCapturedPayments read and empty the shared ledger by default', async () => {
    clearCapturedPayments()
    await provider.updateSubscription!({ userId: 'shared-user', newProductId: 'price_pro' })
    expect(getCapturedPayments().subscriptions[0].userId).toBe('shared-user')
    expect(getCapturedPayments(ledger).subscriptions).toHaveLength(0)
    clearCapturedPayments()
    expect(getCapturedPayments().subscriptions).toHaveLength(0)
  })
})
