import Stripe from 'stripe'
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CAPTURE_WEBHOOK_SECRET,
  mapCaptureEventType,
  normalizeCaptureStatus,
  parseCaptureWebhookEvent,
  signCaptureWebhookPayload,
  verifyCaptureWebhookSignature,
} from '../webhook.js'

const NOW = Date.UTC(2026, 0, 15, 12, 0, 0)
const NOW_SECONDS = Math.floor(NOW / 1000)
const payload = JSON.stringify({ id: 'evt_capture_000001', type: 'ping', data: { object: {} } })

describe('signCaptureWebhookPayload / verifyCaptureWebhookSignature', () => {
  it('produces a Stripe-format header that verifies', () => {
    const header = signCaptureWebhookPayload(payload, 'whsec_test', NOW_SECONDS)
    expect(header).toMatch(new RegExp(`^t=${NOW_SECONDS},v1=[0-9a-f]{64}$`))
    expect(verifyCaptureWebhookSignature(payload, header, 'whsec_test', { now: NOW })).toBe(true)
  })

  it('is deterministic for the same payload, secret and time', () => {
    expect(signCaptureWebhookPayload(payload, 's', NOW_SECONDS)).toBe(
      signCaptureWebhookPayload(payload, 's', NOW_SECONDS),
    )
  })

  it('rejects a wrong secret, a tampered body, and a malformed header', () => {
    const header = signCaptureWebhookPayload(payload, 'whsec_test', NOW_SECONDS)
    expect(verifyCaptureWebhookSignature(payload, header, 'whsec_other', { now: NOW })).toBe(false)
    expect(verifyCaptureWebhookSignature(`${payload} `, header, 'whsec_test', { now: NOW })).toBe(
      false,
    )
    expect(verifyCaptureWebhookSignature(payload, 'garbage', 'whsec_test', { now: NOW })).toBe(
      false,
    )
    expect(
      verifyCaptureWebhookSignature(payload, `t=${NOW_SECONDS}`, 'whsec_test', { now: NOW }),
    ).toBe(false)
    expect(verifyCaptureWebhookSignature('', header, 'whsec_test', { now: NOW })).toBe(false)
  })

  it('accepts any matching v1 entry among several', () => {
    const good = signCaptureWebhookPayload(payload, 'whsec_test', NOW_SECONDS)
    const header = `t=${NOW_SECONDS},v1=${'0'.repeat(64)},${good.split(',')[1]}`
    expect(verifyCaptureWebhookSignature(payload, header, 'whsec_test', { now: NOW })).toBe(true)
  })

  it('rejects a signature outside the tolerance window, and honours a custom tolerance', () => {
    const old = signCaptureWebhookPayload(payload, 'whsec_test', NOW_SECONDS - 301)
    expect(verifyCaptureWebhookSignature(payload, old, 'whsec_test', { now: NOW })).toBe(false)
    expect(
      verifyCaptureWebhookSignature(payload, old, 'whsec_test', {
        now: NOW,
        toleranceSeconds: 600,
      }),
    ).toBe(true)
  })

  it('is accepted by the real Stripe SDK verifier (the code path the Stripe bond uses)', () => {
    const header = signCaptureWebhookPayload(
      payload,
      DEFAULT_CAPTURE_WEBHOOK_SECRET,
      Math.floor(Date.now() / 1000),
    )
    // constructEvent is a local HMAC check — no request is made.
    const stripe = new Stripe('sk_test_capture_offline')
    const event = stripe.webhooks.constructEvent(payload, header, DEFAULT_CAPTURE_WEBHOOK_SECRET)
    expect(event.id).toBe('evt_capture_000001')
    expect(() =>
      stripe.webhooks.constructEvent(payload, header, 'whsec_not_the_dev_secret'),
    ).toThrow()
  })
})

describe('mapCaptureEventType', () => {
  it.each([
    ['customer.subscription.created', 'created'],
    ['customer.subscription.updated', 'renewed'],
    ['customer.subscription.resumed', 'renewed'],
    ['customer.subscription.pending_update_applied', 'renewed'],
    ['customer.subscription.deleted', 'canceled'],
    ['customer.subscription.paused', 'paused'],
    ['customer.subscription.pending_update_expired', 'expired'],
    ['customer.subscription.trial_will_end', 'trial_ending'],
    ['checkout.session.completed', 'checkout.session.completed'],
  ])('maps %s to %s', (raw, mapped) => {
    expect(mapCaptureEventType(raw)).toBe(mapped)
  })
})

describe('normalizeCaptureStatus', () => {
  it('uses the Stripe bond table', () => {
    expect(normalizeCaptureStatus('active')).toBe('active')
    expect(normalizeCaptureStatus('unpaid')).toBe('past_due')
    expect(normalizeCaptureStatus('incomplete')).toBe('pending')
    expect(normalizeCaptureStatus('incomplete_expired')).toBe('expired')
    expect(normalizeCaptureStatus('bogus')).toBe('unknown')
    expect(normalizeCaptureStatus(undefined)).toBe('unknown')
  })
})

describe('parseCaptureWebhookEvent', () => {
  it('returns only the type for non-subscription events', () => {
    expect(parseCaptureWebhookEvent({ type: 'charge.refunded' })).toEqual({
      type: 'charge.refunded',
    })
  })

  it('reads the item-level period end, falling back to the top level', () => {
    const itemLevel = parseCaptureWebhookEvent({
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: 'cus_1',
          status: 'past_due',
          items: {
            data: [{ price: { id: 'price_1', product: 'prod_1' }, current_period_end: 100 }],
          },
        },
      },
    })
    expect(itemLevel).toEqual({
      type: 'renewed',
      subscription: {
        customerId: 'cus_1',
        productId: 'prod_1',
        priceId: 'price_1',
        expiresAt: new Date(100_000).toISOString(),
        autoRenews: true,
        status: 'past_due',
        isActive: false,
      },
    })

    const topLevel = parseCaptureWebhookEvent({
      type: 'customer.subscription.deleted',
      data: { object: { status: 'canceled', current_period_end: 200, items: { data: [] } } },
    })
    expect(topLevel.subscription?.expiresAt).toBe(new Date(200_000).toISOString())
    expect(topLevel.subscription?.autoRenews).toBe(false)
  })
})
