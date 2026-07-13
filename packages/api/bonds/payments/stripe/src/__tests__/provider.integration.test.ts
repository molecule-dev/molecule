/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual stripe SDK.
 *
 * The unit suites (`provider.test.ts`, `bondAdapter.test.ts`) mock the very
 * `stripe` module this bond wraps, so they can only validate OUR assumptions
 * about Stripe — not Stripe. The bond's one fully in-process surface is webhook
 * signature verification (`webhooks.constructEvent` is pure HMAC crypto — no
 * network), and it is exactly the surface where real integrations die: a body
 * parsed by `express.json()` never verifies, a redelivered webhook arrives
 * minutes late, and a missing `STRIPE_WEBHOOK_SECRET` must read as
 * "misconfigured server", not "attack". These tests sign real headers with the
 * SDK's own `generateTestHeaderString` and drive the shipped provider +
 * bondAdapter end-to-end against them. Everything network-bound (checkout,
 * subscription retrieval, Connect) stays audited-not-tested — those need a live
 * Stripe account.
 *
 * @module
 */

import Stripe from 'stripe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { paymentProvider } from '../bondAdapter.js'
import {
  getClient,
  normalizeSubscription,
  normalizeSubscriptionStatus,
  verifyWebhookSignature,
} from '../provider.js'
import type { SubscriptionResult } from '../types.js'

const WEBHOOK_SECRET = 'whsec_integration_test_secret_do_not_use'

// 2100-01-01T00:00:00Z — a fixed far-future period end so assertions are exact.
const PERIOD_END_SEC = 4102444800
const PERIOD_END_ISO = '2100-01-01T00:00:00.000Z'

/** Signs a payload exactly the way Stripe's servers would (same SDK crypto). */
const sign = (payload: string, opts: { timestamp?: number; secret?: string } = {}): string =>
  getClient().webhooks.generateTestHeaderString({
    payload,
    secret: opts.secret ?? WEBHOOK_SECRET,
    ...(opts.timestamp !== undefined ? { timestamp: opts.timestamp } : {}),
  })

/**
 * A realistic `customer.subscription.*` event body. Pretty-printed ON PURPOSE:
 * `JSON.stringify(JSON.parse(payload))` does NOT round-trip these bytes, which is
 * what lets the parsed-body test below prove the express.json() trap for real.
 */
const makeEventPayload = (opts: {
  status: string
  type?: string
  itemPeriodEnd?: number | undefined
  topLevelPeriodEnd?: number
}): string =>
  JSON.stringify(
    {
      id: 'evt_integration_1',
      object: 'event',
      type: opts.type ?? 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_integration_1',
          object: 'subscription',
          status: opts.status,
          customer: 'cus_integration_1',
          cancel_at_period_end: false,
          canceled_at: null,
          ...(opts.topLevelPeriodEnd !== undefined
            ? { current_period_end: opts.topLevelPeriodEnd }
            : {}),
          items: {
            data: [
              {
                id: 'si_integration_1',
                price: { id: 'price_pro_monthly', product: 'prod_pro' },
                ...(opts.itemPeriodEnd !== undefined
                  ? { current_period_end: opts.itemPeriodEnd }
                  : {}),
              },
            ],
          },
        },
      },
    },
    null,
    2,
  )

const originalSecretKey = process.env.STRIPE_SECRET_KEY
const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

beforeAll(() => {
  // The Stripe client construction is offline; the key only has to exist.
  process.env.STRIPE_SECRET_KEY = 'sk_test_integration_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET
})

afterAll(() => {
  process.env.STRIPE_SECRET_KEY = originalSecretKey
  process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret
})

describe('@molecule/api-payments-stripe × REAL stripe webhook crypto', () => {
  it('full lifecycle: a genuinely signed subscription webhook flows through verify → adapter with plan/status intact', async () => {
    const payload = makeEventPayload({ status: 'active', itemPeriodEnd: PERIOD_END_SEC })
    const header = sign(payload)

    // Raw verification returns the parsed event.
    const event = verifyWebhookSignature(payload, header)
    expect(event.type).toBe('customer.subscription.updated')
    expect((event.data.object as { id?: string }).id).toBe('sub_integration_1')

    // The bond adapter end-to-end, with the Buffer body express.raw() would hand it.
    const parsed = await paymentProvider.handleWebhookEvent!({
      body: Buffer.from(payload),
      headers: { 'stripe-signature': header },
    })
    expect(parsed).toEqual({
      type: 'renewed',
      subscription: {
        customerId: 'cus_integration_1',
        // BOTH identifiers surface — apps register plans by env-configured
        // price ids while Stripe reports the parent product id.
        productId: 'prod_pro',
        priceId: 'price_pro_monthly',
        expiresAt: PERIOD_END_ISO,
        autoRenews: true,
        status: 'active',
        isActive: true,
      },
    })
  })

  it('ENTITLEMENT GATE: a signed renewal-failure webhook (past_due) is verified but NOT active', async () => {
    // Stripe fires a signed customer.subscription.updated with status=past_due
    // and an advanced period end when a renewal payment fails. The signature is
    // VALID — the adapter must still surface isActive:false so the notification
    // handler never extends premium for an unpaid cycle.
    const payload = makeEventPayload({ status: 'past_due', itemPeriodEnd: PERIOD_END_SEC })
    const parsed = await paymentProvider.handleWebhookEvent!({
      body: Buffer.from(payload),
      headers: { 'stripe-signature': sign(payload) },
    })
    expect(parsed?.subscription?.status).toBe('past_due')
    expect(parsed?.subscription?.isActive).toBe(false)
    // The period end still parses — entitlement gating must come from isActive,
    // not from "expiresAt is in the future".
    expect(parsed?.subscription?.expiresAt).toBe(PERIOD_END_ISO)
  })

  it('CONSUMER PROPERTY: a webhook redelivered/processed 4 minutes late still verifies (default tolerance)', async () => {
    // Stripe retries webhooks and queues back up during outages; the SDK's
    // default timestamp tolerance is 300s. 240s keeps a 60s deterministic margin
    // (test runtime is milliseconds) — inside the window, so a slow-but-genuine
    // delivery must NOT be rejected.
    expect(getClient().webhooks.DEFAULT_TOLERANCE).toBe(300)

    const payload = makeEventPayload({ status: 'active', itemPeriodEnd: PERIOD_END_SEC })
    const late = sign(payload, { timestamp: Math.floor(Date.now() / 1000) - 240 })
    const event = verifyWebhookSignature(payload, late)
    expect(event.type).toBe('customer.subscription.updated')
  })

  it('FAILURE DISAMBIGUATION: stale replay vs parsed-body mangling vs missing secret are all distinct', async () => {
    const payload = makeEventPayload({ status: 'active', itemPeriodEnd: PERIOD_END_SEC })

    // (a) Too old (400s > 300s tolerance): the timestamp error names the actual
    // problem — "wait/replay", not "your secret is wrong".
    const stale = sign(payload, { timestamp: Math.floor(Date.now() / 1000) - 400 })
    expect(() => verifyWebhookSignature(payload, stale)).toThrow(/tolerance zone/i)

    // (b) The express.json() trap: verifying the re-serialized body against a
    // header signed for the ORIGINAL bytes fails as a SIGNATURE mismatch — the
    // exact failure an integrator sees when a JSON body parser ran first.
    const mangled = JSON.stringify(JSON.parse(payload))
    expect(mangled).not.toBe(payload) // the parser really did change the bytes
    expect(() => verifyWebhookSignature(mangled, sign(payload))).toThrow(
      /no signatures found matching/i,
    )

    // (c) Missing STRIPE_WEBHOOK_SECRET: an actionable config error (names the
    // key, 503, config.notConfigured) — a misconfigured server must never be
    // mistaken for a forged webhook.
    delete process.env.STRIPE_WEBHOOK_SECRET
    try {
      let configError: unknown
      try {
        verifyWebhookSignature(payload, sign(payload, { secret: WEBHOOK_SECRET }))
      } catch (error) {
        configError = error
      }
      expect(String((configError as Error).message)).toContain('STRIPE_WEBHOOK_SECRET is not set')
      expect((configError as { statusCode?: number }).statusCode).toBe(503)
      expect((configError as { errorKey?: string }).errorKey).toBe('config.notConfigured')
    } finally {
      process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET
    }

    // (d) The adapter contract: verification failures surface as null (logged),
    // never as a throw the route handler has to guess about.
    const tampered = payload.replace('"status": "active"', '"status": "trialing"')
    const viaAdapter = await paymentProvider.handleWebhookEvent!({
      body: Buffer.from(tampered),
      headers: { 'stripe-signature': sign(payload) },
    })
    expect(viaAdapter).toBeNull()
  })

  it('OLD-API-VERSION RESILIENCE: period end on the subscription (not the item) still yields expiresAt', async () => {
    // Webhook payload shape follows the API version pinned on the WEBHOOK
    // ENDPOINT. Pre-2025 versions send current_period_end top-level on the
    // subscription; dropping it would read downstream as "never expires".
    const payload = makeEventPayload({
      status: 'active',
      itemPeriodEnd: undefined,
      topLevelPeriodEnd: PERIOD_END_SEC,
    })
    const parsed = await paymentProvider.handleWebhookEvent!({
      body: Buffer.from(payload),
      headers: { 'stripe-signature': sign(payload) },
    })
    expect(parsed?.subscription?.expiresAt).toBe(PERIOD_END_ISO)
  })

  it('status normalization agrees between the verify path and the raw Stripe vocabulary', () => {
    // Pure mapping, real values Stripe actually sends. `unpaid` and `past_due`
    // both mean "renewal not paid" — neither may normalize to an active status.
    expect(normalizeSubscriptionStatus('active')).toBe('active')
    expect(normalizeSubscriptionStatus('trialing')).toBe('trialing')
    expect(normalizeSubscriptionStatus('past_due')).toBe('past_due')
    expect(normalizeSubscriptionStatus('unpaid')).toBe('past_due')
    expect(normalizeSubscriptionStatus('incomplete')).toBe('pending')
    expect(normalizeSubscriptionStatus('incomplete_expired')).toBe('expired')
    expect(normalizeSubscriptionStatus(undefined)).toBe('unknown')
    expect(normalizeSubscriptionStatus('some_future_status')).toBe('unknown')

    const result: SubscriptionResult = {
      id: 'sub_integration_1',
      status: 'past_due',
      customer: 'cus_integration_1',
      items: { data: [{ id: 'si_1', price: { id: 'price_pro_monthly', product: 'prod_pro' } }] },
      current_period_start: PERIOD_END_SEC - 2592000,
      current_period_end: PERIOD_END_SEC,
      cancel_at_period_end: false,
      canceled_at: null,
    }
    const normalized = normalizeSubscription(result)
    expect(normalized.status).toBe('past_due')
    expect(normalized.isActive).toBe(false) // same gate the webhook path applies
    expect(normalized.currentPeriodEnd).toBe(PERIOD_END_SEC * 1000)
  })

  it('sanity: the SDK class used for signing is the same one the provider wraps', () => {
    // Guards against a future where getClient() stops being a real Stripe
    // instance (e.g. an accidental test-double leaking into the build).
    expect(getClient()).toBeInstanceOf(Stripe)
  })
})
