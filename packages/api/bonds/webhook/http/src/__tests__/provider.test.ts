import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WebhookProvider } from '@molecule/api-webhook'

import { createProvider } from '../provider.js'

/* ------------------------------------------------------------------ */
/*  Mock fetch                                                         */
/* ------------------------------------------------------------------ */

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('@molecule/api-webhook-http', () => {
  let provider: WebhookProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = createProvider({ retryCount: 0, retryDelay: 0 })
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

    it('registers multiple webhooks independently', async () => {
      const hook1 = await provider.register('https://a.com', ['event.a'])
      const hook2 = await provider.register('https://b.com', ['event.b'])

      expect(hook1.id).not.toBe(hook2.id)
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
    it('delivers to matching webhooks', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      await provider.register('https://example.com/hook', ['order.created'])
      const results = await provider.dispatch('order.created', { orderId: '123' })

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
      expect(results[0].status).toBe(200)
      expect(results[0].deliveryId).toBeTruthy()
      expect(results[0].duration).toBeGreaterThanOrEqual(0)
    })

    it('skips non-matching webhooks', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      await provider.register('https://a.com', ['order.created'])
      await provider.register('https://b.com', ['user.updated'])

      const results = await provider.dispatch('order.created', {})
      expect(results).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('delivers to multiple matching webhooks', async () => {
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

    it('includes signature header in request', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      await provider.register('https://example.com/hook', ['event.a'])
      await provider.dispatch('event.a', { data: true })

      const fetchCall = mockFetch.mock.calls[0]
      const headers = fetchCall[1].headers as Record<string, string>
      expect(headers['x-webhook-signature']).toBeTruthy()
      expect(headers['x-webhook-event']).toBe('event.a')
      expect(headers['content-type']).toBe('application/json')
    })

    it('includes custom headers from registration', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      await provider.register('https://example.com/hook', ['event.a'], {
        headers: { 'X-Custom': 'my-value' },
      })
      await provider.dispatch('event.a', {})

      const fetchCall = mockFetch.mock.calls[0]
      const headers = fetchCall[1].headers as Record<string, string>
      expect(headers['X-Custom']).toBe('my-value')
    })

    it('handles fetch failure gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await provider.register('https://example.com/hook', ['event.a'])
      const results = await provider.dispatch('event.a', {})

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].status).toBe(0)
    })

    it('handles non-2xx responses', async () => {
      mockFetch.mockResolvedValue(new Response('Server Error', { status: 500 }))

      await provider.register('https://example.com/hook', ['event.a'])
      const results = await provider.dispatch('event.a', {})

      expect(results[0].success).toBe(false)
      expect(results[0].status).toBe(500)
    })

    it('sends JSON payload in request body', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      await provider.register('https://example.com/hook', ['event.a'])
      await provider.dispatch('event.a', { orderId: '456' })

      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1].body).toBe(JSON.stringify({ orderId: '456' }))
    })
  })

  describe('dispatch with retries', () => {
    it('retries failed deliveries', async () => {
      const providerWithRetries = createProvider({ retryCount: 2, retryDelay: 0 })
      await providerWithRetries.register('https://example.com/hook', ['event.a'])

      mockFetch
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(new Response('OK', { status: 200 }))

      const results = await providerWithRetries.dispatch('event.a', {})

      expect(results[0].success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('stops retrying after max attempts', async () => {
      const providerWithRetries = createProvider({ retryCount: 1, retryDelay: 0 })
      await providerWithRetries.register('https://example.com/hook', ['event.a'])

      mockFetch.mockRejectedValue(new Error('fail'))

      const results = await providerWithRetries.dispatch('event.a', {})

      expect(results[0].success).toBe(false)
      expect(mockFetch).toHaveBeenCalledTimes(2) // initial + 1 retry
    })
  })

  describe('getDeliveryLog', () => {
    it('returns deliveries for a specific webhook', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      const hook = await provider.register('https://example.com/hook', ['event.a'])
      await provider.dispatch('event.a', { data: 1 })
      await provider.dispatch('event.a', { data: 2 })

      const log = await provider.getDeliveryLog(hook.id)
      expect(log).toHaveLength(2)
      expect(log[0].webhookId).toBe(hook.id)
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

      const page = await provider.getDeliveryLog(hook.id, { limit: 2, offset: 1 })
      expect(page).toHaveLength(2)
    })

    it('does not return deliveries from other webhooks', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      const hook1 = await provider.register('https://a.com', ['event.a'])
      const hook2 = await provider.register('https://b.com', ['event.a'])
      await provider.dispatch('event.a', {})

      const log1 = await provider.getDeliveryLog(hook1.id)
      const log2 = await provider.getDeliveryLog(hook2.id)
      expect(log1).toHaveLength(1)
      expect(log2).toHaveLength(1)
      expect(log1[0].webhookId).toBe(hook1.id)
      expect(log2[0].webhookId).toBe(hook2.id)
    })
  })

  describe('retry', () => {
    it('retries a specific delivery', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response('Error', { status: 500 }))
        .mockResolvedValueOnce(new Response('OK', { status: 200 }))

      const hook = await provider.register('https://example.com/hook', ['event.a'])
      const [delivery] = await provider.dispatch('event.a', { data: true })

      expect(delivery.success).toBe(false)

      const retryResult = await provider.retry(delivery.deliveryId)
      expect(retryResult.success).toBe(true)
      expect(retryResult.status).toBe(200)
      expect(retryResult.webhookId).toBe(hook.id)
    })

    it('throws for non-existent delivery', async () => {
      await expect(provider.retry('non-existent')).rejects.toThrow('does not exist')
    })

    it('throws if webhook was unregistered', async () => {
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      const hook = await provider.register('https://example.com/hook', ['event.a'])
      const [delivery] = await provider.dispatch('event.a', {})
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
      const p = createProvider({ signatureHeader: 'x-custom-sig', retryCount: 0 })
      mockFetch.mockResolvedValue(new Response('OK', { status: 200 }))

      await p.register('https://example.com/hook', ['event.a'])
      await p.dispatch('event.a', {})

      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
      expect(headers['x-custom-sig']).toBeTruthy()
    })
  })
})
