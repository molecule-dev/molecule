import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  NotificationPayload,
  PushNotificationProvider,
  PushSubscription,
  SendResult,
} from '@molecule/api-push-notifications'

const record = vi.fn(() => Promise.resolve())

vi.mock('@molecule/api-activity', () => ({
  record: (...args: unknown[]) => record(...args),
}))

import { createPushCaptureProvider, provider } from '../provider.js'

const subscription: PushSubscription = {
  endpoint: 'https://push.example.com/abc',
  keys: { p256dh: 'p', auth: 'a' },
}

const payload: NotificationPayload = {
  title: 'Order shipped',
  options: { body: 'Your order is on the way' },
}

describe('push capture provider', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    record.mockResolvedValue(undefined)
  })

  it('exports a default provider', () => {
    expect(typeof provider.send).toBe('function')
  })

  describe('intercept-only', () => {
    it('records a captured event and returns a synthetic 201 SendResult', async () => {
      const push = createPushCaptureProvider()
      const result = await push.send(subscription, payload)

      expect(result).toEqual({ statusCode: 201, headers: {}, body: '' })

      expect(record).toHaveBeenCalledTimes(1)
      const event = record.mock.calls[0][0]
      expect(event.type).toBe('push')
      expect(event.status).toBe('captured')
      expect(event.recipient).toBe(subscription.endpoint)
      expect(event.summary).toBe('Order shipped')
    })

    it('records one event per subscription in sendMany', async () => {
      const push = createPushCaptureProvider()
      const results = await push.sendMany(
        [subscription, { ...subscription, endpoint: 'x' }],
        payload,
      )
      expect(results).toHaveLength(2)
      expect(results[0].result).toBeDefined()
      expect(record).toHaveBeenCalledTimes(2)
    })

    it('returns empty vapid keys and undefined public key', () => {
      const push = createPushCaptureProvider()
      expect(push.generateVapidKeys()).toEqual({ publicKey: '', privateKey: '' })
      expect(push.getPublicKey()).toBeUndefined()
    })
  })

  describe('delegate + tee', () => {
    it('delegates send and records a sent event', async () => {
      const realResult: SendResult = { statusCode: 201, headers: { x: '1' }, body: 'ok' }
      const real: PushNotificationProvider = {
        configure: vi.fn(),
        send: vi.fn(() => Promise.resolve(realResult)),
        sendMany: vi.fn(),
        generateVapidKeys: vi.fn(() => ({ publicKey: 'pub', privateKey: 'priv' })),
        getPublicKey: vi.fn(() => 'pub'),
      }
      const push = createPushCaptureProvider(real)

      const result = await push.send(subscription, payload)
      expect(real.send).toHaveBeenCalledWith(subscription, payload)
      expect(result).toBe(realResult)
      expect(record.mock.calls[0][0].status).toBe('sent')
    })

    it('records a failed event and rethrows', async () => {
      const real: PushNotificationProvider = {
        configure: vi.fn(),
        send: vi.fn(() => Promise.reject(new Error('gone'))),
        sendMany: vi.fn(),
        generateVapidKeys: vi.fn(),
        getPublicKey: vi.fn(),
      }
      const push = createPushCaptureProvider(real)
      const results = await push.sendMany([subscription], payload)
      expect(results[0].error).toBeInstanceOf(Error)
      expect(record.mock.calls[0][0].status).toBe('failed')
    })

    it('delegates vapid + public key to the real provider', () => {
      const real: PushNotificationProvider = {
        configure: vi.fn(),
        send: vi.fn(),
        sendMany: vi.fn(),
        generateVapidKeys: vi.fn(() => ({ publicKey: 'pub', privateKey: 'priv' })),
        getPublicKey: vi.fn(() => 'pub'),
      }
      const push = createPushCaptureProvider(real)
      expect(push.generateVapidKeys()).toEqual({ publicKey: 'pub', privateKey: 'priv' })
      expect(push.getPublicKey()).toBe('pub')
    })
  })
})
