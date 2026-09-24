/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to
 * `api.resend.com`) is stubbed.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendMail, setTransport } from '@molecule/api-emails'

import { provider as resend } from '../index.js'

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      RESEND_API_KEY: 're_readme_key',
      RESEND_FROM: 'Acme <no-reply@acme.example>',
    }
    delete process.env.RESEND_BASE_URL
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  it('POSTs the message to Resend with the API key and normalizes the result', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ id: '4ef9a417-02e9-4d39-ad75-9611e0fcc33c' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setTransport(resend)

    const result = await sendMail({
      from: process.env.RESEND_FROM ?? 'onboarding@resend.dev',
      to: ['ada@example.com'],
      subject: 'Welcome to Acme',
      text: 'Thanks for signing up!',
      html: '<p>Thanks for signing up!</p>',
    })

    expect(result).toEqual({
      accepted: ['ada@example.com'],
      rejected: [],
      messageId: '4ef9a417-02e9-4d39-ad75-9611e0fcc33c',
      response: '200',
    })
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://api.resend.com/emails')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer re_readme_key')
    expect(JSON.parse(String(init?.body))).toEqual({
      from: 'Acme <no-reply@acme.example>',
      to: ['ada@example.com'],
      subject: 'Welcome to Acme',
      text: 'Thanks for signing up!',
      html: '<p>Thanks for signing up!</p>',
    })
  })
})
