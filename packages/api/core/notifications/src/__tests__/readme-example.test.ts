/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — through the webhook bond, with only
 * the network (`fetch`) stubbed, as the bond's own tests do.
 *
 * @module
 */
import { createHmac } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-notifications-webhook'

import { notifyAll, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds the named webhook channel and fans a signed POST out through notifyAll', async () => {
    vi.stubEnv('NOTIFICATIONS_WEBHOOK_URL', 'https://hooks.example.com/ops')
    vi.stubEnv('NOTIFICATIONS_WEBHOOK_SECRET', 'test-secret')
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(null))
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      'webhook',
      createProvider({
        url: process.env.NOTIFICATIONS_WEBHOOK_URL,
        secret: process.env.NOTIFICATIONS_WEBHOOK_SECRET,
      }),
    )

    const results = await notifyAll({
      subject: 'Service Down',
      body: 'API is not responding',
      metadata: { service: 'api', severity: 'critical' },
    })
    const failed = results.filter((result) => !result.success)

    expect(failed).toEqual([])
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ success: true, channel: 'webhook' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://hooks.example.com/ops')
    const body = String(init?.body)
    expect(JSON.parse(body)).toMatchObject({
      subject: 'Service Down',
      body: 'API is not responding',
      metadata: { service: 'api', severity: 'critical' },
    })
    const expected = `sha256=${createHmac('sha256', 'test-secret').update(body).digest('hex')}`
    expect((init?.headers as Record<string, string>)['X-Signature-256']).toBe(expected)
  })
})
