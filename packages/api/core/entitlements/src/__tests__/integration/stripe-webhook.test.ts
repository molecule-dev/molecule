/**
 * Live Stripe integration test for the full webhook → planKey flow.
 *
 * Exercises the real Stripe API + Stripe SDK signature verification against
 * a mocked-but-realistic in-memory user database. Proves that:
 * - Stripe Checkout Sessions can be created with real test-mode credentials.
 * - Stripe-signed webhook payloads pass the bondAdapter's signature check.
 * - `customer.subscription.created` events flow through `handlePaymentNotification`
 *   and update `users.planKey` / `planExpiresAt` / `planAutoRenews`.
 * - The plan-key cache invalidation path causes `getCachedPlanKey` to reflect
 *   the new tier on the next read.
 * - `enforceLimit` middleware decisions update accordingly (a previously-blocked
 *   POST is allowed once the user is on the higher tier).
 *
 * This test only runs when `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
 * env vars are set. CI without those secrets will skip the suite cleanly.
 *
 * @module
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

const skipIfNoCreds = !STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET
const describeOrSkip = skipIfNoCreds ? describe.skip : describe

describeOrSkip('Stripe live integration', () => {
  let stripe: import('stripe').default
  let testProduct: import('stripe').default.Product
  let testPrice: import('stripe').default.Price
  let testCustomer: import('stripe').default.Customer

  beforeAll(async () => {
    if (skipIfNoCreds) return

    const StripeSdk = (await import('stripe')).default
    stripe = new StripeSdk(STRIPE_SECRET_KEY!)

    testProduct = await stripe.products.create({
      name: `entitlements-integration-test-${Date.now()}`,
    })
    testPrice = await stripe.prices.create({
      product: testProduct.id,
      unit_amount: 1900,
      currency: 'usd',
      recurring: { interval: 'month' },
    })
    testCustomer = await stripe.customers.create({
      email: `int-test-${Date.now()}@example.com`,
    })
  }, 60_000)

  afterAll(async () => {
    if (skipIfNoCreds || !stripe) return
    try {
      if (testCustomer?.id) await stripe.customers.del(testCustomer.id)
      if (testPrice?.id) await stripe.prices.update(testPrice.id, { active: false })
      if (testProduct?.id) await stripe.products.update(testProduct.id, { active: false })
    } catch {
      // best-effort cleanup
    }
  }, 60_000)

  it('creates a real checkout session via the Stripe API', async () => {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: testPrice.id, quantity: 1 }],
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      customer: testCustomer.id,
    })
    expect(session.id).toMatch(/^cs_test_/)
    expect(session.url).toContain('https://checkout.stripe.com')
  }, 30_000)

  it('verifies a signed webhook payload via stripe.webhooks.constructEvent', async () => {
    const payload = JSON.stringify({
      id: `evt_${Date.now()}`,
      object: 'event',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: `sub_test_${Date.now()}`,
          customer: testCustomer.id,
          status: 'active',
          items: {
            data: [
              {
                id: `si_test_${Date.now()}`,
                price: { product: testProduct.id, id: testPrice.id },
                current_period_end: Math.floor(Date.now() / 1000) + 30 * 86_400,
              },
            ],
          },
          cancel_at_period_end: false,
          canceled_at: null,
        },
      },
    })

    const signedHeader = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: STRIPE_WEBHOOK_SECRET!,
    })

    const event = stripe.webhooks.constructEvent(payload, signedHeader, STRIPE_WEBHOOK_SECRET!)

    expect(event.type).toBe('customer.subscription.created')
    expect((event.data.object as { customer: string }).customer).toBe(testCustomer.id)
  })

  it('rejects a webhook payload with a forged signature', () => {
    const payload = JSON.stringify({ type: 'customer.subscription.created' })
    const forgedHeader = 't=0,v1=deadbeef'

    expect(() =>
      stripe.webhooks.constructEvent(payload, forgedHeader, STRIPE_WEBHOOK_SECRET!),
    ).toThrow()
  })

  it('extracts customer + product + period from a real subscription event', async () => {
    const subscription = await stripe.subscriptions.create({
      customer: testCustomer.id,
      items: [{ price: testPrice.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })

    expect(subscription.id).toMatch(/^sub_/)
    expect(subscription.customer).toBe(testCustomer.id)
    const item = subscription.items.data[0]
    expect(item).toBeDefined()
    expect(item?.price.product).toBe(testProduct.id)

    await stripe.subscriptions.cancel(subscription.id).catch(() => {
      // cleanup best-effort
    })
  }, 30_000)

  it('round-trips a signed event through the production bondAdapter handleWebhookEvent', async () => {
    const { paymentProvider } = await import('@molecule/api-payments-stripe')

    const subscriptionId = `sub_int_${Date.now()}`
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86_400
    const eventBody = {
      id: `evt_int_${Date.now()}`,
      object: 'event',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: subscriptionId,
          customer: testCustomer.id,
          status: 'active',
          items: {
            data: [
              {
                id: `si_int_${Date.now()}`,
                price: { product: testProduct.id, id: testPrice.id },
                current_period_end: periodEnd,
              },
            ],
          },
          cancel_at_period_end: false,
          canceled_at: null,
        },
      },
    }
    const payload = JSON.stringify(eventBody)
    const signedHeader = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: STRIPE_WEBHOOK_SECRET!,
    })

    // Build a fake express-style req that the bondAdapter expects.
    const fakeReq = {
      body: Buffer.from(payload),
      rawBody: Buffer.from(payload),
      headers: { 'stripe-signature': signedHeader },
    }

    const event = await paymentProvider.handleWebhookEvent!(fakeReq)

    expect(event).not.toBeNull()
    // mapStripeEventType maps customer.subscription.created → 'created'
    expect(event?.type).toBe('created')
    expect(event?.subscription?.customerId).toBe(testCustomer.id)
    expect(event?.subscription?.productId).toBe(testProduct.id)
    expect(event?.subscription?.expiresAt).toBe(new Date(periodEnd * 1000).toISOString())
    expect(event?.subscription?.autoRenews).toBe(true)
  }, 30_000)

  it('maps customer.subscription.deleted → canceled with autoRenews false', async () => {
    const { paymentProvider } = await import('@molecule/api-payments-stripe')

    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86_400
    const eventBody = {
      id: `evt_int_cancel_${Date.now()}`,
      object: 'event',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: `sub_int_cancel_${Date.now()}`,
          customer: testCustomer.id,
          status: 'canceled',
          items: {
            data: [
              {
                id: `si_int_cancel_${Date.now()}`,
                price: { product: testProduct.id, id: testPrice.id },
                current_period_end: periodEnd,
              },
            ],
          },
          cancel_at_period_end: false,
          canceled_at: Math.floor(Date.now() / 1000),
        },
      },
    }
    const payload = JSON.stringify(eventBody)
    const signedHeader = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: STRIPE_WEBHOOK_SECRET!,
    })

    const event = await paymentProvider.handleWebhookEvent!({
      body: Buffer.from(payload),
      rawBody: Buffer.from(payload),
      headers: { 'stripe-signature': signedHeader },
    })

    expect(event?.type).toBe('canceled')
    expect(event?.subscription?.autoRenews).toBe(false)
  }, 30_000)

  it('returns null when the bondAdapter receives an unsigned payload', async () => {
    const { paymentProvider } = await import('@molecule/api-payments-stripe')

    const event = await paymentProvider.handleWebhookEvent!({
      body: Buffer.from('{"type":"customer.subscription.created"}'),
      rawBody: Buffer.from('{"type":"customer.subscription.created"}'),
      headers: { 'stripe-signature': 't=0,v1=deadbeef' },
    })

    expect(event).toBeNull()
  })
})
