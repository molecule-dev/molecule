import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WebhookDeliveryResult, WebhookProvider } from '@molecule/api-webhook'

const record = vi.fn(() => Promise.resolve())

vi.mock('@molecule/api-activity', () => ({
  record: (...args: unknown[]) => record(...args),
}))

import { createWebhookCaptureProvider, provider } from '../provider.js'

describe('webhook capture provider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    record.mockResolvedValue(undefined)
  })

  it('exports a default provider', () => {
    expect(typeof provider.dispatch).toBe('function')
  })

  describe('intercept-only', () => {
    it('records a captured event and returns a synthetic delivery result', async () => {
      const webhook = createWebhookCaptureProvider()
      const results = await webhook.dispatch('orders.created', { id: 1 })

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
      expect(results[0].status).toBe(200)
      expect(results[0].webhookId).toMatch(/^captured-/)

      expect(record).toHaveBeenCalledTimes(1)
      const event = record.mock.calls[0][0]
      expect(event.type).toBe('webhook')
      expect(event.status).toBe('captured')
      expect(event.recipient).toBe('orders.created')
    })

    it('returns intercept-only defaults for register/list/log/retry', async () => {
      const webhook = createWebhookCaptureProvider()
      const reg = await webhook.register('https://x.test', ['e'])
      expect(reg.url).toBe('https://x.test')
      expect(reg.active).toBe(true)
      expect(await webhook.list()).toEqual([])
      expect(await webhook.getDeliveryLog('w')).toEqual([])
      const retry = await webhook.retry('d')
      expect(retry.success).toBe(true)
    })
  })

  describe('delegate + tee', () => {
    it('delegates dispatch and records a sent event', async () => {
      const realResults: WebhookDeliveryResult[] = [
        { webhookId: 'w1', deliveryId: 'd1', status: 200, success: true, duration: 12 },
      ]
      const real: WebhookProvider = {
        register: vi.fn(),
        unregister: vi.fn(),
        dispatch: vi.fn(() => Promise.resolve(realResults)),
        list: vi.fn(),
        getDeliveryLog: vi.fn(),
        retry: vi.fn(),
      }
      const webhook = createWebhookCaptureProvider(real)

      const results = await webhook.dispatch('orders.created', { id: 1 })
      expect(real.dispatch).toHaveBeenCalledWith('orders.created', { id: 1 })
      expect(results).toBe(realResults)
      expect(record.mock.calls[0][0].status).toBe('sent')
    })

    it('records a failed event and rethrows', async () => {
      const real: WebhookProvider = {
        register: vi.fn(),
        unregister: vi.fn(),
        dispatch: vi.fn(() => Promise.reject(new Error('boom'))),
        list: vi.fn(),
        getDeliveryLog: vi.fn(),
        retry: vi.fn(),
      }
      const webhook = createWebhookCaptureProvider(real)
      await expect(webhook.dispatch('e', {})).rejects.toThrow('boom')
      expect(record.mock.calls[0][0].status).toBe('failed')
    })
  })
})
