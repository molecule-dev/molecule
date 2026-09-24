/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (global `fetch` to
 * `api.stripe.com`) is stubbed; the webhook is signed with a real HMAC.
 *
 * @module
 */
import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createVerificationSession,
  type KycWebhookHeaders,
  processWebhook,
  setProvider,
} from '@molecule/api-kyc'

import { createProvider } from '../index.js'

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'test-key',
      STRIPE_IDENTITY_WEBHOOK_SECRET: 'test-webhook-secret',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  it('creates a hosted session and records the verified webhook for the user', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            id: 'vs_123',
            url: 'https://verify.stripe.com/start/abc',
            expires_at: 1_900_000_000,
            status: 'requires_input',
            type: 'document',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_IDENTITY_WEBHOOK_SECRET,
      }),
    )

    const session = await createVerificationSession({
      userId: 'user-123',
      type: 'document',
      returnUrl: 'https://app.example.com/verify/done',
    })
    expect(session).toEqual({
      sessionId: 'vs_123',
      url: 'https://verify.stripe.com/start/abc',
      expiresAt: 1_900_000_000_000,
    })
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://api.stripe.com/v1/identity/verification_sessions')
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer test-key')
    const form = new URLSearchParams(String(init?.body))
    expect(form.get('type')).toBe('document')
    expect(form.get('metadata[molecule_user_id]')).toBe('user-123')
    expect(form.get('return_url')).toBe('https://app.example.com/verify/done')

    const kycStatusByUser = new Map<string, string>()
    async function handleStripeIdentityWebhook(
      headers: KycWebhookHeaders,
      rawBody: Buffer,
    ): Promise<string> {
      const event = await processWebhook(headers, rawBody)
      if (event.userId) kycStatusByUser.set(event.userId, event.type)
      return event.type
    }

    const rawBody = Buffer.from(
      JSON.stringify({
        id: 'evt_1',
        type: 'identity.verification_session.verified',
        data: {
          object: { id: 'vs_123', type: 'document', metadata: { molecule_user_id: 'user-123' } },
        },
      }),
    )
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = createHmac('sha256', 'test-webhook-secret')
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex')

    await expect(
      handleStripeIdentityWebhook(
        { 'stripe-signature': `t=${timestamp},v1=${signature}` },
        rawBody,
      ),
    ).resolves.toBe('verification.verified')
    expect(kycStatusByUser.get('user-123')).toBe('verification.verified')

    await expect(
      handleStripeIdentityWebhook({ 'stripe-signature': `t=${timestamp},v1=deadbeef` }, rawBody),
    ).rejects.toThrow('Stripe Identity webhook signature mismatch')
  })
})
