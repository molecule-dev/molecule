/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (global `fetch`,
 * which the SSRF-guarded `safeFetch` delegates to) is stubbed.
 *
 * @module
 */
import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { dispatch, getDeliveryLog, register, setProvider } from '@molecule/api-webhook'

import { createProvider } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('ORDERS_WEBHOOK_SECRET', 'test-orders-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns a 202 acceptance receipt, then records the real delivery outcome', async () => {
    let releaseDelivery: () => void = () => {}
    const delivered = new Promise<void>((resolve) => {
      releaseDelivery = resolve
    })
    const fetchMock = vi.fn(async (_input: string | URL | Request, _init?: RequestInit) => {
      await delivered
      return new Response(null, { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      createProvider({ maxRetries: 5, baseDelay: 1000, maxDelay: 60_000, concurrency: 10 }),
    )

    const hook = await register('https://hooks.partner.example.com/orders', ['order.created'], {
      secret: process.env.ORDERS_WEBHOOK_SECRET,
    })

    const [receipt] = await dispatch('order.created', { orderId: 'ord_123', total: 4999 })
    expect(receipt).toMatchObject({ webhookId: hook.id, status: 202, success: true })

    // Still in flight: no log entry yet.
    const pendingLog = await getDeliveryLog(hook.id)
    expect(pendingLog.find((delivery) => delivery.id === receipt?.deliveryId)).toBeUndefined()

    releaseDelivery()

    const outcome = await vi.waitFor(async () => {
      const log = await getDeliveryLog(hook.id)
      const found = log.find((delivery) => delivery.id === receipt?.deliveryId)
      if (!found) throw new Error('not delivered yet')
      return found
    })
    expect(outcome).toMatchObject({ event: 'order.created', status: 200, success: true })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://hooks.partner.example.com/orders')
    const body = String(init?.body)
    const headers = init?.headers as Record<string, string>
    expect(headers['x-webhook-signature']).toBe(
      createHmac('sha256', 'test-orders-secret').update(body).digest('hex'),
    )
    expect(headers['x-webhook-delivery-id']).toBeUndefined()
  })
})
