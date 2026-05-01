/**
 * Tests for the Stripe Identity KYC provider.
 *
 * Uses a stubbed `fetch` injected via {@link createProvider}'s options so
 * we never hit the real Stripe API. Webhook signature verification is
 * exercised end-to-end with a known secret + computed HMAC.
 *
 * @module
 */

import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CreateKycSessionOptions } from '@molecule/api-kyc'

import { createProvider, verifyStripeSignature } from '../provider.js'

interface MockFetchCall {
  url: string
  init: RequestInit | undefined
}

const okJson = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })

const errorJson = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const SECRET = 'sk_test_dummy'
const WEBHOOK_SECRET = 'whsec_dummy'

const stubbedFetch = (responses: Response[]) => {
  const calls: MockFetchCall[] = []
  const fn = vi
    .fn()
    .mockImplementation(async (url: string, init?: RequestInit): Promise<Response> => {
      calls.push({ url, init })
      const next = responses.shift()
      if (!next) throw new Error('Mock fetch ran out of responses')
      return next
    })
  return Object.assign(fn as unknown as typeof fetch, { calls })
}

const sessionFixture = {
  id: 'vs_test_123',
  url: 'https://verify.stripe.com/abc',
  expires_at: 1_900_000_000,
  status: 'requires_input',
  type: 'document',
  metadata: { molecule_user_id: 'user-1', molecule_verification_type: 'document' },
  last_error: null,
}

const sessionOptions: CreateKycSessionOptions = {
  userId: 'user-1',
  type: 'document',
  returnUrl: 'https://app.example.com/verify/done',
  metadata: { case_id: 'case-42' },
}

describe('Stripe Identity provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.STRIPE_SECRET_KEY = SECRET
    process.env.STRIPE_IDENTITY_WEBHOOK_SECRET = WEBHOOK_SECRET
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createVerificationSession', () => {
    it('POSTs to /v1/identity/verification_sessions with bearer auth + form body', async () => {
      const fetchStub = stubbedFetch([okJson(sessionFixture)])
      const provider = createProvider({ fetch: fetchStub, apiBaseUrl: 'https://api.stripe.test' })

      const session = await provider.createVerificationSession(sessionOptions)

      expect(fetchStub.calls).toHaveLength(1)
      const call = fetchStub.calls[0]
      expect(call.url).toBe('https://api.stripe.test/v1/identity/verification_sessions')
      expect(call.init?.method).toBe('POST')

      const headers = call.init?.headers as Record<string, string>
      expect(headers.authorization).toBe(`Bearer ${SECRET}`)
      expect(headers['content-type']).toBe('application/x-www-form-urlencoded')
      expect(headers['stripe-version']).toBeTruthy()

      const body = new URLSearchParams(call.init?.body as string)
      expect(body.get('type')).toBe('document')
      expect(body.get('return_url')).toBe('https://app.example.com/verify/done')
      expect(body.get('metadata[molecule_user_id]')).toBe('user-1')
      expect(body.get('metadata[molecule_verification_type]')).toBe('document')
      expect(body.get('metadata[case_id]')).toBe('case-42')

      expect(session).toEqual({
        sessionId: 'vs_test_123',
        url: 'https://verify.stripe.com/abc',
        expiresAt: 1_900_000_000 * 1000,
      })
    })

    it('throws a sanitized error when Stripe returns 400', async () => {
      const fetchStub = stubbedFetch([errorJson({ error: { code: 'parameter_invalid' } }, 400)])
      const provider = createProvider({ fetch: fetchStub })

      await expect(() => provider.createVerificationSession(sessionOptions)).rejects.toThrow(
        'Stripe Identity createSession failed status=400 code=parameter_invalid',
      )
    })

    it('does not echo the secret key in errors', async () => {
      const fetchStub = stubbedFetch([errorJson({ error: { code: 'authentication' } }, 401)])
      const provider = createProvider({ fetch: fetchStub })

      await expect(provider.createVerificationSession(sessionOptions)).rejects.toMatchObject({
        message: expect.not.stringContaining(SECRET),
      })
    })

    it('throws when STRIPE_SECRET_KEY is missing', async () => {
      delete process.env.STRIPE_SECRET_KEY
      const fetchStub = stubbedFetch([])
      const provider = createProvider({ fetch: fetchStub })

      await expect(() => provider.createVerificationSession(sessionOptions)).rejects.toThrow(
        /STRIPE_SECRET_KEY/,
      )
      expect(fetchStub.calls).toHaveLength(0)
    })
  })

  describe('getVerificationStatus', () => {
    it('GETs /v1/identity/verification_sessions/:id and normalizes status', async () => {
      const fetchStub = stubbedFetch([okJson({ ...sessionFixture, status: 'verified' })])
      const provider = createProvider({ fetch: fetchStub })

      const result = await provider.getVerificationStatus('vs_test_123')

      expect(fetchStub.calls[0].url).toBe(
        'https://api.stripe.com/v1/identity/verification_sessions/vs_test_123',
      )
      expect(fetchStub.calls[0].init?.method).toBe('GET')
      expect(result).toEqual({
        sessionId: 'vs_test_123',
        status: 'verified',
        type: 'document',
        lastErrorCode: undefined,
        lastErrorReason: undefined,
      })
    })

    it('maps requires_action → requires_input', async () => {
      const fetchStub = stubbedFetch([
        okJson({
          ...sessionFixture,
          status: 'requires_action',
          last_error: { code: 'document_unverified_other', reason: 'Could not read document.' },
        }),
      ])
      const provider = createProvider({ fetch: fetchStub })

      const result = await provider.getVerificationStatus('vs_test_123')
      expect(result.status).toBe('requires_input')
      expect(result.lastErrorCode).toBe('document_unverified_other')
      expect(result.lastErrorReason).toBe('Could not read document.')
    })

    it('maps unknown statuses to pending', async () => {
      const fetchStub = stubbedFetch([okJson({ ...sessionFixture, status: 'something_new' })])
      const provider = createProvider({ fetch: fetchStub })

      const result = await provider.getVerificationStatus('vs_test_123')
      expect(result.status).toBe('pending')
    })

    it('URL-encodes the session id', async () => {
      const fetchStub = stubbedFetch([okJson(sessionFixture)])
      const provider = createProvider({ fetch: fetchStub })

      await provider.getVerificationStatus('vs/with slash')
      expect(fetchStub.calls[0].url).toBe(
        'https://api.stripe.com/v1/identity/verification_sessions/vs%2Fwith%20slash',
      )
    })
  })

  describe('cancelVerificationSession', () => {
    it('POSTs the cancel sub-route and returns canceled status', async () => {
      const fetchStub = stubbedFetch([okJson({ ...sessionFixture, status: 'canceled' })])
      const provider = createProvider({ fetch: fetchStub })

      const result = await provider.cancelVerificationSession('vs_test_123')

      expect(fetchStub.calls[0].url).toBe(
        'https://api.stripe.com/v1/identity/verification_sessions/vs_test_123/cancel',
      )
      expect(fetchStub.calls[0].init?.method).toBe('POST')
      expect(result.status).toBe('canceled')
    })
  })

  describe('processWebhook', () => {
    const buildSignedRequest = (
      body: string,
      timestamp: number,
      secret: string = WEBHOOK_SECRET,
    ): { headers: Record<string, string>; body: string } => {
      const signature = createHmac('sha256', secret)
        .update(`${timestamp}.${body}`, 'utf8')
        .digest('hex')
      return {
        headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` },
        body,
      }
    }

    it('verifies signature and returns a normalized verified event', async () => {
      const fetchStub = stubbedFetch([])
      const provider = createProvider({ fetch: fetchStub })

      const eventBody = JSON.stringify({
        id: 'evt_1',
        type: 'identity.verification_session.verified',
        data: {
          object: {
            ...sessionFixture,
            status: 'verified',
            metadata: { molecule_user_id: 'user-1', case_id: 'case-42' },
          },
        },
      })
      const now = Math.floor(Date.now() / 1000)
      const { headers, body } = buildSignedRequest(eventBody, now)

      const result = await provider.processWebhook(headers, body)

      expect(result.type).toBe('verification.verified')
      expect(result.sessionId).toBe('vs_test_123')
      expect(result.userId).toBe('user-1')
      expect(result.verificationType).toBe('document')
      expect(result.metadata).toEqual({ molecule_user_id: 'user-1', case_id: 'case-42' })
    })

    it('normalizes requires_input event', async () => {
      const provider = createProvider({ fetch: stubbedFetch([]) })

      const eventBody = JSON.stringify({
        type: 'identity.verification_session.requires_input',
        data: {
          object: {
            ...sessionFixture,
            status: 'requires_input',
            last_error: { code: 'consent_declined', reason: 'User declined consent.' },
          },
        },
      })
      const now = Math.floor(Date.now() / 1000)
      const { headers, body } = buildSignedRequest(eventBody, now)

      const result = await provider.processWebhook(headers, body)
      expect(result.type).toBe('verification.requires_input')
      expect(result.lastErrorCode).toBe('consent_declined')
      expect(result.lastErrorReason).toBe('User declined consent.')
    })

    it('normalizes canceled event', async () => {
      const provider = createProvider({ fetch: stubbedFetch([]) })

      const eventBody = JSON.stringify({
        type: 'identity.verification_session.canceled',
        data: { object: { ...sessionFixture, status: 'canceled' } },
      })
      const now = Math.floor(Date.now() / 1000)
      const { headers, body } = buildSignedRequest(eventBody, now)

      const result = await provider.processWebhook(headers, body)
      expect(result.type).toBe('verification.canceled')
    })

    it('rejects payloads with a missing signature header', async () => {
      const provider = createProvider({ fetch: stubbedFetch([]) })

      await expect(provider.processWebhook({}, '{}')).rejects.toThrow(
        'Stripe Identity webhook signature missing',
      )
    })

    it('rejects payloads with a tampered body', async () => {
      const provider = createProvider({ fetch: stubbedFetch([]) })
      const eventBody = JSON.stringify({
        type: 'identity.verification_session.verified',
        data: { object: { id: 'vs_x' } },
      })
      const now = Math.floor(Date.now() / 1000)
      const { headers } = buildSignedRequest(eventBody, now)
      const tamperedBody = eventBody.replace('vs_x', 'vs_y')

      await expect(provider.processWebhook(headers, tamperedBody)).rejects.toThrow(
        'Stripe Identity webhook signature mismatch',
      )
    })

    it('rejects expired signatures (timestamp drift)', async () => {
      const provider = createProvider({ fetch: stubbedFetch([]) })
      const eventBody = JSON.stringify({
        type: 'identity.verification_session.verified',
        data: { object: sessionFixture },
      })
      const ancient = Math.floor(Date.now() / 1000) - 60 * 60 * 24
      const { headers, body } = buildSignedRequest(eventBody, ancient)

      await expect(provider.processWebhook(headers, body)).rejects.toThrow(
        'Stripe Identity webhook signature expired',
      )
    })

    it('rejects unknown event types', async () => {
      const provider = createProvider({ fetch: stubbedFetch([]) })
      const eventBody = JSON.stringify({
        type: 'identity.verification_session.processing',
        data: { object: sessionFixture },
      })
      const now = Math.floor(Date.now() / 1000)
      const { headers, body } = buildSignedRequest(eventBody, now)

      await expect(provider.processWebhook(headers, body)).rejects.toThrow(
        /Stripe Identity webhook event type not supported/,
      )
    })

    it('rejects malformed JSON bodies even when signature is valid', async () => {
      const provider = createProvider({ fetch: stubbedFetch([]) })
      const malformed = '{not json'
      const now = Math.floor(Date.now() / 1000)
      const signature = createHmac('sha256', WEBHOOK_SECRET)
        .update(`${now}.${malformed}`, 'utf8')
        .digest('hex')

      await expect(
        provider.processWebhook({ 'stripe-signature': `t=${now},v1=${signature}` }, malformed),
      ).rejects.toThrow('Stripe Identity webhook payload is not valid JSON')
    })

    it('does not echo the webhook secret in errors', async () => {
      const provider = createProvider({ fetch: stubbedFetch([]) })

      await expect(
        provider.processWebhook({ 'stripe-signature': 't=1,v1=ff' }, '{}'),
      ).rejects.toMatchObject({
        message: expect.not.stringContaining(WEBHOOK_SECRET),
      })
    })
  })

  describe('verifyStripeSignature unit', () => {
    it('accepts a valid t+v1 header', () => {
      const body = '{"hello":"world"}'
      const timestamp = 1_700_000_000
      const sig = createHmac('sha256', WEBHOOK_SECRET)
        .update(`${timestamp}.${body}`, 'utf8')
        .digest('hex')

      expect(() =>
        verifyStripeSignature(
          body,
          `t=${timestamp},v1=${sig}`,
          WEBHOOK_SECRET,
          300,
          timestamp * 1000 + 1000,
        ),
      ).not.toThrow()
    })

    it('rejects a malformed header', () => {
      expect(() => verifyStripeSignature('x', 'no_equals_signs', WEBHOOK_SECRET, 300)).toThrow(
        'Stripe Identity webhook signature malformed',
      )
    })

    it('accepts when at least one v1 candidate matches', () => {
      const body = 'payload'
      const timestamp = 1_700_000_000
      const valid = createHmac('sha256', WEBHOOK_SECRET)
        .update(`${timestamp}.${body}`, 'utf8')
        .digest('hex')
      const header = `t=${timestamp},v1=ffff,v1=${valid}`

      expect(() =>
        verifyStripeSignature(body, header, WEBHOOK_SECRET, 300, timestamp * 1000),
      ).not.toThrow()
    })
  })
})
