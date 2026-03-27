import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { WebhookProvider } from '@molecule/api-webhook'

import { createProvider } from '../provider.js'

/* ------------------------------------------------------------------ */
/*  Mock fetch and timers                                              */
/* ------------------------------------------------------------------ */

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Waits for async queue processing to complete.
 *
 * @param ms - Maximum time to wait.
 */
async function waitForProcessing(ms = 500): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('@molecule/api-webhook-queue', () => {
  let provider: WebhookProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = createProvider({
      maxRetries: 0,
      baseDelay: 0,
      maxDelay: 0,
      concurrency: 10,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('register', () => {
    it('registers a webhook with auto-generated id and secret', async () => {
      const hook = await provider.register('https://example.com/hook', ['order.created'])

      expect(hook.id).toBeTruthy()
      expect(hook.url).toBe('https://example.com/hook')
      expect(hook.events).toEqual(['order.created'])
      expect(hook.secret).toBeTruthy()
      expect(hook.active).toBe(true)
      expect(hook.createdAt).toBeInstanceOf(Date)
    })

    it('uses provided secret when given', async () => {
      const hook = await provider.register('https://example.com/hook', ['event.a'], {
        secret: 'my-secret',
      })

      expect(hook.secret).toBe('my-secret')
    })
  })

  describe('unregister', () => {
    it('removes a registered webhook', async () => {
      const hook = await provider.register('https://example.com/hook', ['event.a'])
      await provider.unregister(hook.id)

      const hooks = await provider.list()
      expect(hooks).toHaveLength(0)
    })

    it('throws for non-existent webhook', async () => {
      await expect(provider.unregister('non-existent')).rejects.toThrow('does not exist')
    })
  })

  describe('list', () => {
    it('returns all registered webhooks', async () => {
      await provider.register('https://a.com', ['event.a'])
      await provider.register('https://b.com', ['event.b'])

      const hooks = await provider.list()
      expect(hooks).toHaveLength(2)
    })

    it('returns empty array when no webhooks registered', async () => {
      const hooks = await provider.list()
      expect(hooks).toEqual([])
    })
  })

  describe('dispatch', () => {
    it('returns accepted results immediately', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      await provider.register('https://example.com/hook', ['order.created'])
      const results = await provider.dispatch('order.created', { orderId: '123' })

      expect(results).toHaveLength(1)
      expect(results[0].status).toBe(202)
      expect(results[0].success).toBe(true)
      expect(results[0].duration).toBe(0)
      expect(results[0].deliveryId).toBeTruthy()
    })

    it('skips non-matching webhooks', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      await provider.register('https://a.com', ['order.created'])
      await provider.register('https://b.com', ['user.updated'])

      const results = await provider.dispatch('order.created', {})
      expect(results).toHaveLength(1)
    })

    it('dispatches to multiple matching webhooks', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      await provider.register('https://a.com', ['event.a'])
      await provider.register('https://b.com', ['event.a'])

      const results = await provider.dispatch('event.a', {})
      expect(results).toHaveLength(2)
    })

    it('returns empty array when no webhooks match', async () => {
      const results = await provider.dispatch('unmatched.event', {})
      expect(results).toEqual([])
    })

    it('processes deliveries asynchronously', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      const hook = await provider.register('https://example.com/hook', ['event.a'])
      await provider.dispatch('event.a', { data: true })

      await waitForProcessing()

      const log = await provider.getDeliveryLog(hook.id)
      expect(log).toHaveLength(1)
      expect(log[0].status).toBe(200)
      expect(log[0].success).toBe(true)
    })

    it('includes signature header in delivery', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      await provider.register('https://example.com/hook', ['event.a'])
      await provider.dispatch('event.a', { data: true })

      await waitForProcessing()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const fetchCall = mockFetch.mock.calls[0]
      const headers = fetchCall[1].headers as Record<string, string>
      expect(headers['x-webhook-signature']).toBeTruthy()
      expect(headers['x-webhook-event']).toBe('event.a')
    })

    it('handles fetch failure in delivery', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const hook = await provider.register('https://example.com/hook', ['event.a'])
      await provider.dispatch('event.a', {})

      await waitForProcessing()

      const log = await provider.getDeliveryLog(hook.id)
      expect(log).toHaveLength(1)
      expect(log[0].success).toBe(false)
      expect(log[0].status).toBe(0)
    })
  })

  describe('dispatch with retries', () => {
    it('retries with exponential backoff on failure', async () => {
      const retryProvider = createProvider({
        maxRetries: 2,
        baseDelay: 0,
        maxDelay: 0,
      })

      mockFetch
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(new Response('OK', { status: 200 }))

      const hook = await retryProvider.register('https://example.com/hook', ['event.a'])
      await retryProvider.dispatch('event.a', {})

      await waitForProcessing()

      expect(mockFetch).toHaveBeenCalledTimes(3)
      const log = await retryProvider.getDeliveryLog(hook.id)
      expect(log).toHaveLength(1)
      expect(log[0].success).toBe(true)
    })

    it('gives up after max retries', async () => {
      const retryProvider = createProvider({
        maxRetries: 1,
        baseDelay: 0,
        maxDelay: 0,
      })

      mockFetch.mockRejectedValue(new Error('fail'))

      const hook = await retryProvider.register('https://example.com/hook', ['event.a'])
      await retryProvider.dispatch('event.a', {})

      await waitForProcessing()

      expect(mockFetch).toHaveBeenCalledTimes(2) // initial + 1 retry
      const log = await retryProvider.getDeliveryLog(hook.id)
      expect(log).toHaveLength(1)
      expect(log[0].success).toBe(false)
    })
  })

  describe('getDeliveryLog', () => {
    it('returns deliveries for a specific webhook', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      const hook = await provider.register('https://example.com/hook', ['event.a'])
      await provider.dispatch('event.a', { data: 1 })
      await provider.dispatch('event.a', { data: 2 })

      await waitForProcessing()

      const log = await provider.getDeliveryLog(hook.id)
      expect(log).toHaveLength(2)
    })

    it('returns empty array for webhook with no deliveries', async () => {
      const hook = await provider.register('https://example.com/hook', ['event.a'])
      const log = await provider.getDeliveryLog(hook.id)
      expect(log).toEqual([])
    })

    it('applies pagination options', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      const hook = await provider.register('https://example.com/hook', ['event.a'])
      for (let i = 0; i < 5; i++) {
        await provider.dispatch('event.a', { index: i })
      }

      await waitForProcessing()

      const page = await provider.getDeliveryLog(hook.id, { limit: 2, offset: 1 })
      expect(page).toHaveLength(2)
    })
  })

  describe('retry', () => {
    it('re-enqueues a failed delivery', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response('Error', { status: 500 }))
        .mockResolvedValueOnce(new Response('OK', { status: 200 }))

      const hook = await provider.register('https://example.com/hook', ['event.a'])
      const [dispatchResult] = await provider.dispatch('event.a', { data: true })

      await waitForProcessing()

      const retryResult = await provider.retry(dispatchResult.deliveryId)
      expect(retryResult.status).toBe(202)
      expect(retryResult.success).toBe(true)

      await waitForProcessing()

      const log = await provider.getDeliveryLog(hook.id)
      const successfulDeliveries = log.filter((d) => d.success)
      expect(successfulDeliveries.length).toBeGreaterThanOrEqual(1)
    })

    it('throws for non-existent delivery', async () => {
      await expect(provider.retry('non-existent')).rejects.toThrow('does not exist')
    })

    it('throws if webhook was unregistered', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      const hook = await provider.register('https://example.com/hook', ['event.a'])
      const [delivery] = await provider.dispatch('event.a', {})

      await waitForProcessing()

      await provider.unregister(hook.id)
      await expect(provider.retry(delivery.deliveryId)).rejects.toThrow('no longer exists')
    })
  })

  describe('createProvider configuration', () => {
    it('uses default config when none provided', () => {
      const p = createProvider()
      expect(p).toBeDefined()
    })

    it('uses custom signature header', async () => {
      const p = createProvider({
        signatureHeader: 'x-custom-sig',
        maxRetries: 0,
        baseDelay: 0,
      })
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      await p.register('https://example.com/hook', ['event.a'])
      await p.dispatch('event.a', {})

      await waitForProcessing()

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
      expect(headers['x-custom-sig']).toBeTruthy()
    })
  })
})
