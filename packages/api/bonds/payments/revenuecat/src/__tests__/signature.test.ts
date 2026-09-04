/**
 * Tests for the RevenueCat webhook authentication primitives.
 *
 * Real `node:crypto` throughout — a signature verifier proven only against its
 * own mock proves nothing.
 *
 * @module
 */

import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  constantTimeEquals,
  DEFAULT_SIGNATURE_TOLERANCE_SECONDS,
  parseSignatureHeader,
  REVENUECAT_SIGNATURE_HEADER,
  verifyWebhookAuthorization,
  verifyWebhookSignature,
} from '../signature.js'

const SECRET = 'whsec_revenuecat_test_secret'
const BODY = JSON.stringify({ api_version: '1.0', event: { type: 'RENEWAL' } })

/** Signs a body the way RevenueCat documents: HMAC-SHA256 over `"<t>.<raw body>"`. */
const sign = (body: string | Buffer, timestampSeconds: number, secret = SECRET): string => {
  const bytes = typeof body === 'string' ? Buffer.from(body, 'utf8') : body
  const digest = createHmac('sha256', secret)
    .update(Buffer.concat([Buffer.from(`${timestampSeconds}.`, 'utf8'), bytes]))
    .digest('hex')
  return `t=${timestampSeconds},v1=${digest}`
}

describe('constants', () => {
  it('names the header RevenueCat actually sends, lower-cased for header lookup', () => {
    expect(REVENUECAT_SIGNATURE_HEADER).toBe('x-revenuecat-webhook-signature')
  })

  it('defaults the replay window to 5 minutes', () => {
    expect(DEFAULT_SIGNATURE_TOLERANCE_SECONDS).toBe(300)
  })
})

describe('constantTimeEquals', () => {
  it('is true for identical strings', () => {
    expect(constantTimeEquals('abc', 'abc')).toBe(true)
  })

  it('is false for different strings of the SAME length', () => {
    expect(constantTimeEquals('abc', 'abd')).toBe(false)
  })

  it('is false for different lengths WITHOUT throwing (timingSafeEqual would)', () => {
    expect(constantTimeEquals('abc', 'abcdef')).toBe(false)
    expect(constantTimeEquals('', 'a')).toBe(false)
  })

  it('is true for two empty strings', () => {
    expect(constantTimeEquals('', '')).toBe(true)
  })
})

describe('parseSignatureHeader', () => {
  it('parses the documented t=…,v1=… format', () => {
    expect(parseSignatureHeader('t=1700000000,v1=deadbeef')).toEqual({
      timestamp: '1700000000',
      signature: 'deadbeef',
    })
  })

  it('tolerates surrounding whitespace', () => {
    expect(parseSignatureHeader(' t=1700000000 , v1=deadbeef ')).toEqual({
      timestamp: '1700000000',
      signature: 'deadbeef',
    })
  })

  it('ignores unknown parts and keeps t/v1', () => {
    expect(parseSignatureHeader('v0=old,t=1,v1=abc')).toEqual({ timestamp: '1', signature: 'abc' })
  })

  it('returns null when t or v1 is missing, or the header is junk', () => {
    expect(parseSignatureHeader('v1=abc')).toBeNull()
    expect(parseSignatureHeader('t=1')).toBeNull()
    expect(parseSignatureHeader('')).toBeNull()
    expect(parseSignatureHeader('garbage')).toBeNull()
    expect(parseSignatureHeader('=nokey,v1=abc')).toBeNull()
  })
})

describe('verifyWebhookSignature', () => {
  const now = 1_700_000_000_000
  const t = Math.floor(now / 1000)

  it('accepts a correctly signed body', () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, t), SECRET, 300, now)).toBe(true)
  })

  it('accepts a Buffer body identically to the equivalent string', () => {
    const buffer = Buffer.from(BODY, 'utf8')
    expect(verifyWebhookSignature(buffer, sign(buffer, t), SECRET, 300, now)).toBe(true)
    expect(verifyWebhookSignature(buffer, sign(BODY, t), SECRET, 300, now)).toBe(true)
  })

  it('verifies over the RAW BYTES — a re-serialized body fails', () => {
    // The trap the RevenueCat docs warn about: JSON.parse → JSON.stringify
    // reorders/reformats and changes the bytes.
    const raw = '{"api_version": "1.0", "event": {"type": "RENEWAL"}}'
    const header = sign(raw, t)
    const reserialized = JSON.stringify(JSON.parse(raw))

    expect(verifyWebhookSignature(raw, header, SECRET, 300, now)).toBe(true)
    expect(reserialized).not.toBe(raw)
    expect(verifyWebhookSignature(reserialized, header, SECRET, 300, now)).toBe(false)
  })

  it('rejects a tampered body', () => {
    const header = sign(BODY, t)
    const tampered = JSON.stringify({ api_version: '1.0', event: { type: 'INITIAL_PURCHASE' } })
    expect(verifyWebhookSignature(tampered, header, SECRET, 300, now)).toBe(false)
  })

  it('rejects a signature made with a different secret (a forger has no secret)', () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, t, 'wrong_secret'), SECRET, 300, now)).toBe(
      false,
    )
  })

  it('rejects a signature whose timestamp was swapped after signing', () => {
    const header = sign(BODY, t)
    const swapped = header.replace(`t=${t}`, `t=${t + 1}`)
    expect(verifyWebhookSignature(BODY, swapped, SECRET, 300, now)).toBe(false)
  })

  it('rejects a replay older than the tolerance', () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, t - 301), SECRET, 300, now)).toBe(false)
    expect(verifyWebhookSignature(BODY, sign(BODY, t - 299), SECRET, 300, now)).toBe(true)
  })

  it('rejects a timestamp too far in the FUTURE too (clock-skew abuse)', () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, t + 301), SECRET, 300, now)).toBe(false)
  })

  it('honours a custom tolerance', () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, t - 500), SECRET, 300, now)).toBe(false)
    expect(verifyWebhookSignature(BODY, sign(BODY, t - 500), SECRET, 600, now)).toBe(true)
  })

  it('defaults the tolerance to 300 seconds when not given', () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, t - 299), SECRET, undefined, now)).toBe(true)
    expect(verifyWebhookSignature(BODY, sign(BODY, t - 301), SECRET, undefined, now)).toBe(false)
  })

  it('rejects a malformed or non-numeric header without throwing', () => {
    expect(verifyWebhookSignature(BODY, 'garbage', SECRET, 300, now)).toBe(false)
    expect(verifyWebhookSignature(BODY, '', SECRET, 300, now)).toBe(false)
    expect(verifyWebhookSignature(BODY, 't=abc,v1=deadbeef', SECRET, 300, now)).toBe(false)
  })

  it('rejects an empty signature value', () => {
    expect(verifyWebhookSignature(BODY, `t=${t},v1=`, SECRET, 300, now)).toBe(false)
  })
})

describe('verifyWebhookAuthorization', () => {
  it('accepts the exact configured value', () => {
    expect(verifyWebhookAuthorization('Bearer s3cret', 'Bearer s3cret')).toBe(true)
  })

  it('rejects a different value, including one that only differs in case or prefix', () => {
    expect(verifyWebhookAuthorization('Bearer S3CRET', 'Bearer s3cret')).toBe(false)
    expect(verifyWebhookAuthorization('s3cret', 'Bearer s3cret')).toBe(false)
    expect(verifyWebhookAuthorization('Bearer s3cret ', 'Bearer s3cret')).toBe(false)
  })

  it('rejects a missing or empty header', () => {
    expect(verifyWebhookAuthorization(undefined, 'Bearer s3cret')).toBe(false)
    expect(verifyWebhookAuthorization('', 'Bearer s3cret')).toBe(false)
  })
})
