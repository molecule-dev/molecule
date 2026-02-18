const { mockSetVapidDetails, mockSendNotification, mockGenerateVAPIDKeys } = vi.hoisted(() => ({
  mockSetVapidDetails: vi.fn(),
  mockSendNotification: vi.fn(),
  mockGenerateVAPIDKeys: vi.fn(),
}))

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
    generateVAPIDKeys: mockGenerateVAPIDKeys,
  },
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

describe('@molecule/api-push-notifications-web-push', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('configure', () => {
    it('should configure VAPID details from explicit config', () => {
      const provider = createProvider()
      provider.configure({
        email: 'test@example.com',
        publicKey: 'pub-key',
        privateKey: 'priv-key',
      })

      expect(mockSetVapidDetails).toHaveBeenCalledWith(
        'mailto:test@example.com',
        'pub-key',
        'priv-key',
      )
    })

    it('should configure VAPID details from env vars', () => {
      const origEmail = process.env.VAPID_EMAIL
      const origPub = process.env.VAPID_PUBLIC_KEY
      const origPriv = process.env.VAPID_PRIVATE_KEY

      process.env.VAPID_EMAIL = 'env@test.com'
      process.env.VAPID_PUBLIC_KEY = 'env-pub'
      process.env.VAPID_PRIVATE_KEY = 'env-priv'

      try {
        const provider = createProvider()
        provider.configure()

        expect(mockSetVapidDetails).toHaveBeenCalledWith(
          'mailto:env@test.com',
          'env-pub',
          'env-priv',
        )
      } finally {
        process.env.VAPID_EMAIL = origEmail
        process.env.VAPID_PUBLIC_KEY = origPub
        process.env.VAPID_PRIVATE_KEY = origPriv
      }
    })

    it('should not configure when keys are missing', () => {
      const origEmail = process.env.VAPID_EMAIL
      const origPub = process.env.VAPID_PUBLIC_KEY
      const origPriv = process.env.VAPID_PRIVATE_KEY

      delete process.env.VAPID_EMAIL
      delete process.env.VAPID_PUBLIC_KEY
      delete process.env.VAPID_PRIVATE_KEY

      try {
        const provider = createProvider()
        provider.configure()

        expect(mockSetVapidDetails).not.toHaveBeenCalled()
      } finally {
        if (origEmail) process.env.VAPID_EMAIL = origEmail
        if (origPub) process.env.VAPID_PUBLIC_KEY = origPub
        if (origPriv) process.env.VAPID_PRIVATE_KEY = origPriv
      }
    })
  })

  describe('send', () => {
    it('should send notification with JSON payload', async () => {
      mockSendNotification.mockResolvedValue({
        statusCode: 201,
        headers: {},
        body: '',
      })

      const provider = createProvider()
      provider.configure({
        email: 'test@example.com',
        publicKey: 'pub',
        privateKey: 'priv',
      })

      const subscription = {
        endpoint: 'https://push.example.com',
        keys: { p256dh: 'a', auth: 'b' },
      }
      const result = await provider.send(subscription, { title: 'Hello', body: 'World' })

      expect(mockSendNotification).toHaveBeenCalledWith(
        subscription,
        '{"title":"Hello","body":"World"}',
      )
      expect(result.statusCode).toBe(201)
    })
  })

  describe('sendMany', () => {
    it('should send to multiple subscriptions', async () => {
      mockSendNotification.mockResolvedValue({ statusCode: 201, headers: {}, body: '' })

      const provider = createProvider()
      provider.configure({ email: 'a@b.com', publicKey: 'p', privateKey: 'k' })

      const subs = [
        { endpoint: 'https://push1.example.com', keys: { p256dh: 'a', auth: 'b' } },
        { endpoint: 'https://push2.example.com', keys: { p256dh: 'c', auth: 'd' } },
      ]

      const results = await provider.sendMany(subs, { title: 'Test' })

      expect(results).toHaveLength(2)
      expect(results[0].result?.statusCode).toBe(201)
      expect(results[1].result?.statusCode).toBe(201)
    })

    it('should handle partial failures', async () => {
      mockSendNotification
        .mockResolvedValueOnce({ statusCode: 201, headers: {}, body: '' })
        .mockRejectedValueOnce(new Error('Push failed'))

      const provider = createProvider()
      provider.configure({ email: 'a@b.com', publicKey: 'p', privateKey: 'k' })

      const subs = [
        { endpoint: 'https://push1.example.com', keys: { p256dh: 'a', auth: 'b' } },
        { endpoint: 'https://push2.example.com', keys: { p256dh: 'c', auth: 'd' } },
      ]

      const results = await provider.sendMany(subs, { title: 'Test' })

      expect(results[0].result?.statusCode).toBe(201)
      expect(results[0].error).toBeUndefined()
      expect(results[1].result).toBeUndefined()
      expect(results[1].error).toBeDefined()
    })
  })

  describe('generateVapidKeys', () => {
    it('should delegate to web-push', () => {
      mockGenerateVAPIDKeys.mockReturnValue({ publicKey: 'pub', privateKey: 'priv' })

      const provider = createProvider()
      const keys = provider.generateVapidKeys()

      expect(keys).toEqual({ publicKey: 'pub', privateKey: 'priv' })
    })
  })

  describe('getPublicKey', () => {
    it('should return VAPID_PUBLIC_KEY from env', () => {
      const orig = process.env.VAPID_PUBLIC_KEY
      process.env.VAPID_PUBLIC_KEY = 'test-pub-key'

      try {
        const provider = createProvider()
        expect(provider.getPublicKey()).toBe('test-pub-key')
      } finally {
        if (orig) {
          process.env.VAPID_PUBLIC_KEY = orig
        } else {
          delete process.env.VAPID_PUBLIC_KEY
        }
      }
    })

    it('should return undefined when not set', () => {
      const orig = process.env.VAPID_PUBLIC_KEY
      delete process.env.VAPID_PUBLIC_KEY

      try {
        const provider = createProvider()
        expect(provider.getPublicKey()).toBeUndefined()
      } finally {
        if (orig) process.env.VAPID_PUBLIC_KEY = orig
      }
    })
  })
})
