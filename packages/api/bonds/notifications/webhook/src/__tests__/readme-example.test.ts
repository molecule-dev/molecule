/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written. Only the network (`fetch` to the receiver) is
 * stubbed; the HMAC signature is recomputed to prove it covers the raw body.
 *
 * @module
 */
import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { notifyAll, setProvider } from '@molecule/api-notifications'

import { createProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    process.env.NOTIFICATIONS_WEBHOOK_URL = 'https://hooks.example.com/molecule'
    process.env.NOTIFICATIONS_WEBHOOK_SECRET = 'test-secret'
  })

  afterEach(() => {
    delete process.env.NOTIFICATIONS_WEBHOOK_URL
    delete process.env.NOTIFICATIONS_WEBHOOK_SECRET
    vi.unstubAllGlobals()
  })

  it('POSTs a signed JSON envelope through notifyAll()', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(null, { status: 204 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      'webhook',
      createProvider({
        url: process.env.NOTIFICATIONS_WEBHOOK_URL,
        secret: process.env.NOTIFICATIONS_WEBHOOK_SECRET,
        timeoutMs: 5000,
      }),
    )

    const [result] = await notifyAll({
      subject: 'Order paid',
      body: 'Order #1042 was paid.',
      metadata: { orderId: '1042' },
    })

    expect(result).toMatchObject({ success: true, channel: 'webhook' })
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://hooks.example.com/molecule')
    const rawBody = String(init?.body)
    expect(JSON.parse(rawBody)).toMatchObject({
      subject: 'Order paid',
      body: 'Order #1042 was paid.',
      metadata: { orderId: '1042' },
    })
    const expected = createHmac('sha256', 'test-secret').update(rawBody).digest('hex')
    expect((init?.headers as Record<string, string>)['X-Signature-256']).toBe(`sha256=${expected}`)
  })
})
