/**
 * Google Wallet JWT signer tests.
 *
 * Generates an RSA keypair at test time, signs a sample JWT, then verifies
 * the signature with `node:crypto` and decodes the payload to confirm
 * structural correctness against the Google Wallet schema.
 *
 * @module
 */

import { createVerify, generateKeyPairSync } from 'node:crypto'

import { describe, expect, test } from 'vitest'

import { createGoogleWalletJwt } from '../createGoogleWalletJwt.js'

interface KeyPair {
  publicKey: string
  privateKey: string
}

/**
 * Generate a fresh PEM-encoded RSA-2048 keypair for the test.
 *
 * @returns Public and private keys in PEM form.
 */
function generatePemKeypair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  return { publicKey, privateKey }
}

const samplePassClass = { id: '3388000000022123456.event-class' }
const samplePassObject = {
  id: '3388000000022123456.event-object',
  classId: '3388000000022123456.event-class',
  state: 'ACTIVE',
}

describe('createGoogleWalletJwt', () => {
  test('returns a 3-segment JWT', () => {
    const { privateKey } = generatePemKeypair()
    const jwt = createGoogleWalletJwt(samplePassClass, samplePassObject, {
      clientEmail: 'wallet@example.iam.gserviceaccount.com',
      privateKey,
    })
    expect(jwt.split('.').length).toBe(3)
  })

  test('header decodes to RS256/JWT', () => {
    const { privateKey } = generatePemKeypair()
    const jwt = createGoogleWalletJwt(samplePassClass, samplePassObject, {
      clientEmail: 'wallet@example.iam.gserviceaccount.com',
      privateKey,
    })
    const headerSegment = jwt.split('.')[0]!
    const header = JSON.parse(base64UrlDecode(headerSegment).toString('utf8'))
    expect(header).toEqual({ alg: 'RS256', typ: 'JWT' })
  })

  test('payload contains issuer, audience, payload, origins', () => {
    const { privateKey } = generatePemKeypair()
    const jwt = createGoogleWalletJwt(samplePassClass, samplePassObject, {
      clientEmail: 'wallet@example.iam.gserviceaccount.com',
      privateKey,
    })
    const payloadSegment = jwt.split('.')[1]!
    const payload = JSON.parse(base64UrlDecode(payloadSegment).toString('utf8'))
    expect(payload.iss).toBe('wallet@example.iam.gserviceaccount.com')
    expect(payload.aud).toBe('google')
    expect(payload.typ).toBe('savetowallet')
    expect(payload.origins).toEqual(['https://wallet.google'])
    expect(payload.payload.eventTicketClasses).toEqual([samplePassClass])
    expect(payload.payload.eventTicketObjects).toEqual([samplePassObject])
    expect(typeof payload.iat).toBe('number')
  })

  test('signature verifies with the matching public key', () => {
    const { publicKey, privateKey } = generatePemKeypair()
    const jwt = createGoogleWalletJwt(samplePassClass, samplePassObject, {
      clientEmail: 'wallet@example.iam.gserviceaccount.com',
      privateKey,
    })

    const [headerSeg, payloadSeg, sigSeg] = jwt.split('.') as [string, string, string]
    const verifier = createVerify('RSA-SHA256')
    verifier.update(`${headerSeg}.${payloadSeg}`)
    verifier.end()
    const sigBuf = base64UrlDecode(sigSeg)
    expect(verifier.verify(publicKey, sigBuf)).toBe(true)
  })

  test('signature does NOT verify with an unrelated public key', () => {
    const { privateKey } = generatePemKeypair()
    const otherKeys = generatePemKeypair()
    const jwt = createGoogleWalletJwt(samplePassClass, samplePassObject, {
      clientEmail: 'wallet@example.iam.gserviceaccount.com',
      privateKey,
    })
    const [headerSeg, payloadSeg, sigSeg] = jwt.split('.') as [string, string, string]
    const verifier = createVerify('RSA-SHA256')
    verifier.update(`${headerSeg}.${payloadSeg}`)
    verifier.end()
    expect(verifier.verify(otherKeys.publicKey, base64UrlDecode(sigSeg))).toBe(false)
  })

  test('honors custom origins parameter', () => {
    const { privateKey } = generatePemKeypair()
    const jwt = createGoogleWalletJwt(
      samplePassClass,
      samplePassObject,
      { clientEmail: 'wallet@example.iam.gserviceaccount.com', privateKey },
      ['https://example.com'],
    )
    const payload = JSON.parse(base64UrlDecode(jwt.split('.')[1]!).toString('utf8'))
    expect(payload.origins).toEqual(['https://example.com'])
  })

  test('defaults to the eventTicket pass type', () => {
    const { privateKey } = generatePemKeypair()
    const jwt = createGoogleWalletJwt(samplePassClass, samplePassObject, {
      clientEmail: 'wallet@example.iam.gserviceaccount.com',
      privateKey,
    })
    const payload = JSON.parse(base64UrlDecode(jwt.split('.')[1]!).toString('utf8'))
    expect(payload.payload.eventTicketClasses).toEqual([samplePassClass])
    expect(payload.payload.eventTicketObjects).toEqual([samplePassObject])
    expect(payload.payload.offerClasses).toBeUndefined()
  })

  test('builds a coupon (offer) pass — uses offer keys, NOT eventTicket', () => {
    const { privateKey } = generatePemKeypair()
    const couponClass = { id: '3388000000022123456.coupon-class' }
    const couponObject = {
      id: '3388000000022123456.coupon-object',
      classId: '3388000000022123456.coupon-class',
      state: 'ACTIVE',
    }
    const jwt = createGoogleWalletJwt(
      couponClass,
      couponObject,
      { clientEmail: 'wallet@example.iam.gserviceaccount.com', privateKey },
      undefined,
      'coupon',
    )
    const payload = JSON.parse(base64UrlDecode(jwt.split('.')[1]!).toString('utf8'))
    expect(payload.payload.offerClasses).toEqual([couponClass])
    expect(payload.payload.offerObjects).toEqual([couponObject])
    // Critically, it must NOT emit the event-ticket keys for a coupon.
    expect(payload.payload.eventTicketClasses).toBeUndefined()
    expect(payload.payload.eventTicketObjects).toBeUndefined()
  })

  test("'offer' and 'coupon' are aliases for the same Google offer keys", () => {
    const { privateKey } = generatePemKeypair()
    const sa = { clientEmail: 'wallet@example.iam.gserviceaccount.com', privateKey }
    const offerPayload = JSON.parse(
      base64UrlDecode(
        createGoogleWalletJwt(samplePassClass, samplePassObject, sa, undefined, 'offer').split(
          '.',
        )[1]!,
      ).toString('utf8'),
    )
    const couponPayload = JSON.parse(
      base64UrlDecode(
        createGoogleWalletJwt(samplePassClass, samplePassObject, sa, undefined, 'coupon').split(
          '.',
        )[1]!,
      ).toString('utf8'),
    )
    expect(offerPayload.payload.offerClasses).toBeDefined()
    expect(couponPayload.payload.offerClasses).toBeDefined()
    expect(Object.keys(offerPayload.payload)).toEqual(Object.keys(couponPayload.payload))
  })

  test('routes every supported pass type to its Google payload keys', () => {
    const { privateKey } = generatePemKeypair()
    const sa = { clientEmail: 'wallet@example.iam.gserviceaccount.com', privateKey }
    const cases: Array<[Parameters<typeof createGoogleWalletJwt>[4], string, string]> = [
      ['eventTicket', 'eventTicketClasses', 'eventTicketObjects'],
      ['offer', 'offerClasses', 'offerObjects'],
      ['coupon', 'offerClasses', 'offerObjects'],
      ['loyalty', 'loyaltyClasses', 'loyaltyObjects'],
      ['giftCard', 'giftCardClasses', 'giftCardObjects'],
      ['flight', 'flightClasses', 'flightObjects'],
      ['transit', 'transitClasses', 'transitObjects'],
      ['generic', 'genericClasses', 'genericObjects'],
    ]
    for (const [passType, classKey, objectKey] of cases) {
      const jwt = createGoogleWalletJwt(samplePassClass, samplePassObject, sa, undefined, passType)
      const payload = JSON.parse(base64UrlDecode(jwt.split('.')[1]!).toString('utf8'))
      expect(Object.keys(payload.payload)).toEqual([classKey, objectKey])
      expect(payload.payload[classKey]).toEqual([samplePassClass])
      expect(payload.payload[objectKey]).toEqual([samplePassObject])
    }
  })

  test('rejects an invalid private key without leaking the key material', () => {
    expect(() =>
      createGoogleWalletJwt(samplePassClass, samplePassObject, {
        clientEmail: 'wallet@example.iam.gserviceaccount.com',
        privateKey: 'not-a-real-key',
      }),
    ).toThrowError(/invalid service-account private key/)

    try {
      createGoogleWalletJwt(samplePassClass, samplePassObject, {
        clientEmail: 'wallet@example.iam.gserviceaccount.com',
        privateKey: 'leak-me-please-secret-content',
      })
    } catch (e) {
      expect((e as Error).message).not.toContain('leak-me-please-secret-content')
    }
  })
})

/**
 * Decode a base64-url string back to bytes.
 *
 * @param input - Base64-url string.
 * @returns Decoded bytes.
 */
function base64UrlDecode(input: string): Buffer {
  const padded = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(input.length + ((4 - (input.length % 4)) % 4), '=')
  return Buffer.from(padded, 'base64')
}
