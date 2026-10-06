/**
 * Webhook signing, verification and parsing for the payments capture provider.
 *
 * The signature scheme is Stripe's: a `stripe-signature` header of the form
 * `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" keyed by the
 * secret>`. Because the scheme is identical, a request built here also passes
 * the real Stripe SDK's `webhooks.constructEvent` (and so
 * `@molecule/api-payments-stripe`'s `handleWebhookEvent`) when that bond's
 * `STRIPE_WEBHOOK_SECRET` is set to the same dev secret.
 *
 * @module
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

import type { SubscriptionStatus, WebhookEvent } from '@molecule/api-payments'

/** Header that carries the webhook signature (the Stripe header name). */
export const CAPTURE_SIGNATURE_HEADER = 'stripe-signature'

/** Dev webhook secret used when none is configured. Never a production value. */
export const DEFAULT_CAPTURE_WEBHOOK_SECRET = 'whsec_capture_dev_secret'

/** Default replay window, in seconds (Stripe's default tolerance). */
export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300

/**
 * Computes the hex HMAC-SHA256 signature for a payload at a timestamp.
 *
 * @param payload - The exact raw body that will be sent.
 * @param secret - The webhook secret.
 * @param timestampSeconds - Unix time in seconds.
 * @returns The hex-encoded `v1` signature.
 */
const computeSignature = (payload: string, secret: string, timestampSeconds: number): string =>
  createHmac('sha256', secret).update(`${timestampSeconds}.${payload}`, 'utf8').digest('hex')

/**
 * Builds a Stripe-format signature header for a raw payload.
 *
 * @param payload - The exact raw body that will be sent.
 * @param secret - The webhook secret.
 * @param timestampSeconds - Unix time in seconds to sign at.
 * @returns The header value, `t=<timestamp>,v1=<signature>`.
 */
export const signCaptureWebhookPayload = (
  payload: string,
  secret: string,
  timestampSeconds: number,
): string => `t=${timestampSeconds},v1=${computeSignature(payload, secret, timestampSeconds)}`

/** Options for {@link verifyCaptureWebhookSignature}. */
export interface VerifyCaptureWebhookOptions {
  /** Maximum age of the signature in seconds. Defaults to 300. */
  toleranceSeconds?: number
  /** Current time in milliseconds. Defaults to `Date.now()`. */
  now?: number
}

/**
 * Verifies a Stripe-format signature header against a raw payload.
 *
 * Rejects a missing/malformed header, a signature that does not match any
 * `v1` entry (compared in constant time), and a timestamp outside the
 * tolerance window (replay protection).
 *
 * @param payload - The raw request body exactly as received.
 * @param header - The `stripe-signature` header value.
 * @param secret - The webhook secret.
 * @param options - Tolerance and clock overrides.
 * @returns `true` when the signature is valid and fresh.
 */
export const verifyCaptureWebhookSignature = (
  payload: string,
  header: string,
  secret: string,
  options: VerifyCaptureWebhookOptions = {},
): boolean => {
  if (!payload || !header || !secret) return false

  let timestamp: number | undefined
  const signatures: string[] = []
  for (const part of header.split(',')) {
    const index = part.indexOf('=')
    if (index <= 0) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (key === 't') timestamp = Number(value)
    else if (key === 'v1') signatures.push(value)
  }
  if (timestamp === undefined || !Number.isFinite(timestamp) || signatures.length === 0) {
    return false
  }

  const tolerance = options.toleranceSeconds ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS
  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000)
  if (tolerance > 0 && Math.abs(nowSeconds - timestamp) > tolerance) return false

  const encoder = new TextEncoder()
  const expected = encoder.encode(computeSignature(payload, secret, timestamp))
  return signatures.some((signature) => {
    const actual = encoder.encode(signature)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  })
}

/**
 * Maps a Stripe event type to the simplified type the payment notification
 * handler acts on. Identical to `@molecule/api-payments-stripe`'s mapping, so
 * an app sees the same `WebhookEvent.type` from either bond.
 *
 * @param eventType - The raw event type (e.g. `customer.subscription.deleted`).
 * @returns The simplified type (`created`, `renewed`, `canceled`, …) or the raw
 *   type when it is not a subscription lifecycle event.
 */
export const mapCaptureEventType = (eventType: string): string => {
  switch (eventType) {
    case 'customer.subscription.created':
      return 'created'
    case 'customer.subscription.updated':
    case 'customer.subscription.resumed':
    case 'customer.subscription.pending_update_applied':
      return 'renewed'
    case 'customer.subscription.deleted':
      return 'canceled'
    case 'customer.subscription.paused':
      return 'paused'
    case 'customer.subscription.pending_update_expired':
      return 'expired'
    case 'customer.subscription.trial_will_end':
      return 'trial_ending'
    default:
      return eventType
  }
}

/**
 * Maps a raw (Stripe-vocabulary) subscription status to the provider-agnostic
 * {@link SubscriptionStatus}, with the same table the Stripe bond uses.
 *
 * @param rawStatus - The raw status string.
 * @returns The normalized status (`'unknown'` when unrecognized).
 */
export const normalizeCaptureStatus = (rawStatus: string | undefined): SubscriptionStatus => {
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
 * Parses a verified event body into the core {@link WebhookEvent}, reading the
 * same fields `@molecule/api-payments-stripe`'s `handleWebhookEvent` reads.
 *
 * @param event - The parsed event JSON (`{ type, data: { object } }`).
 * @returns The normalized webhook event.
 */
export const parseCaptureWebhookEvent = (event: {
  type: string
  data?: { object?: Record<string, unknown> }
}): WebhookEvent => {
  if (!event.type.startsWith('customer.subscription.')) {
    return { type: event.type }
  }

  const object = event.data?.object ?? {}
  const items = object.items as
    | { data?: Array<{ price?: { product?: string; id?: string }; current_period_end?: number }> }
    | undefined
  const firstItem = items?.data?.[0]
  const productId = firstItem?.price?.product ? String(firstItem.price.product) : undefined
  const priceId = firstItem?.price?.id ? String(firstItem.price.id) : undefined
  const periodEnd = (firstItem?.current_period_end ?? object.current_period_end) as
    number | undefined
  const rawStatus = typeof object.status === 'string' ? object.status : undefined

  return {
    type: mapCaptureEventType(event.type),
    subscription: {
      customerId: object.customer ? String(object.customer) : undefined,
      productId,
      priceId,
      expiresAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : undefined,
      autoRenews:
        event.type !== 'customer.subscription.deleted' &&
        !object.canceled_at &&
        !object.cancel_at_period_end,
      status: normalizeCaptureStatus(rawStatus),
      isActive: rawStatus === 'active' || rawStatus === 'trialing',
    },
  }
}
