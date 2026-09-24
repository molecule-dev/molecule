/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (global `fetch`,
 * which the SSRF-guarded `safeFetch` delegates to) is stubbed.
 *
 * @module
 */
import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { dispatch, register, setProvider } from '@molecule/api-webhook'

import { createProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('ORDERS_WEBHOOK_SECRET', 'test-orders-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('registers an endpoint and delivers a signed POST to it', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(null, { status: 204 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ timeout: 10_000, retryCount: 3, retryDelay: 2000 }))

    const hook = await register('https://hooks.partner.example.com/orders', ['order.created'], {
      secret: process.env.ORDERS_WEBHOOK_SECRET,
    })
    expect(hook.secret).toBe('test-orders-secret')

    const results = await dispatch('order.created', { orderId: 'ord_123', total: 4999 })
    const failed = results.filter((r) => !r.success)

    expect(failed).toEqual([])
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ webhookId: hook.id, status: 204, success: true })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://hooks.partner.example.com/orders')
    expect(init?.method).toBe('POST')
    const body = String(init?.body)
    expect(JSON.parse(body)).toEqual({ orderId: 'ord_123', total: 4999 })
    const headers = init?.headers as Record<string, string>
    expect(headers['x-webhook-event']).toBe('order.created')
    expect(headers['x-webhook-delivery-id']).toBeTruthy()
    expect(headers['x-webhook-signature']).toBe(
      createHmac('sha256', 'test-orders-secret').update(body).digest('hex'),
    )
  })
})
