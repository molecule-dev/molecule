/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Stripe Identity bond.
 * Only `fetch` (the Stripe REST API) is stubbed; the webhook is signed with a
 * real HMAC the same way the bond's own tests do.
 *
 * @module
 */
import { createHmac } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-kyc-stripe-identity'

import type { KycWebhookHeaders } from '../index.js'
import { createVerificationSession, processWebhook, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds Stripe Identity, creates a hosted session and records verified webhooks', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'test-key')
    vi.stubEnv('STRIPE_IDENTITY_WEBHOOK_SECRET', 'test-webhook-secret')
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'vs_123',
            url: 'https://verify.stripe.com/start/abc',
            expires_at: 1_900_000_000,
            status: 'requires_input',
            type: 'document',
            metadata: { molecule_user_id: 'user-123' },
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
    const redirectTo = session.url
    expect(session.sessionId).toBe('vs_123')
    expect(redirectTo).toBe('https://verify.stripe.com/start/abc')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.stripe.com/v1/identity/verification_sessions')
    expect(init.method).toBe('POST')

    const kycStatusByUser = new Map<string, string>()
    async function handleKycWebhook(headers: KycWebhookHeaders, rawBody: Buffer): Promise<string> {
      const event = await processWebhook(headers, rawBody)
      if (event.userId) kycStatusByUser.set(event.userId, event.type)
      return event.type
    }

    const rawBody = Buffer.from(
      JSON.stringify({
        type: 'identity.verification_session.verified',
        data: {
          object: { id: 'vs_123', type: 'document', metadata: { molecule_user_id: 'user-123' } },
        },
      }),
    )
    const timestamp = Math.floor(Date.now() / 1000)
    const v1 = createHmac('sha256', 'test-webhook-secret')
      .update(`${timestamp}.${rawBody.toString('utf8')}`, 'utf8')
      .digest('hex')

    const type = await handleKycWebhook({ 'stripe-signature': `t=${timestamp},v1=${v1}` }, rawBody)
    expect(type).toBe('verification.verified')
    expect(kycStatusByUser.get('user-123')).toBe('verification.verified')

    await expect(
      handleKycWebhook({ 'stripe-signature': `t=${timestamp},v1=${'0'.repeat(64)}` }, rawBody),
    ).rejects.toThrow('signature mismatch')
  })
})
