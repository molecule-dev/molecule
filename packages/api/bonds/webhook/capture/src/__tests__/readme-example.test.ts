/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Nothing is mocked — intercept-only
 * mode makes no network call; the console sink's `record` is only spied on.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setSink } from '@molecule/api-activity'
import { provider as consoleSink } from '@molecule/api-activity-console'
import { dispatch, register, setProvider } from '@molecule/api-webhook'

import { provider as captureWebhooks } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('intercepts the dispatch, returns a synthetic 200, and records it to the sink', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const recordSpy = vi.spyOn(consoleSink, 'record')

    setSink(consoleSink)
    setProvider(captureWebhooks)

    const registration = await register('https://hooks.example.com/orders', ['order.created'], {
      secret: 'whsec-dev',
    })
    expect(registration).toMatchObject({
      url: 'https://hooks.example.com/orders',
      events: ['order.created'],
      secret: 'whsec-dev',
      active: true,
    })

    const results = await dispatch('order.created', { orderId: 'ord_123', total: 4999 })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ status: 200, success: true, duration: 0 })
    expect(results[0]?.webhookId).toMatch(/^captured-/)
    expect(results[0]?.deliveryId).toMatch(/^captured-/)
    expect(fetchSpy).not.toHaveBeenCalled()

    expect(recordSpy).toHaveBeenCalledTimes(1)
    expect(recordSpy.mock.calls[0]?.[0]).toMatchObject({
      type: 'webhook',
      status: 'captured',
      recipient: 'order.created',
      payload: { event: 'order.created', payload: { orderId: 'ord_123', total: 4999 } },
    })
  })
})
