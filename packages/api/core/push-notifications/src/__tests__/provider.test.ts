/**
 * Tests for push notification provider management.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { NotificationPayload, PushNotificationProvider, PushSubscription } from '../types.js'

const mockSubscription: PushSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
  keys: {
    p256dh: 'test-p256dh-key',
    auth: 'test-auth-key',
  },
}

const mockPayload: NotificationPayload = {
  title: 'Test Notification',
  options: {
    body: 'This is a test notification',
  },
}

const createMockProvider = (): PushNotificationProvider => ({
  configure: vi.fn(),
  send: vi.fn().mockResolvedValue({ statusCode: 201, headers: {}, body: '' }),
  sendMany: vi.fn().mockResolvedValue([]),
  generateVapidKeys: vi.fn().mockReturnValue({
    publicKey: 'generated-public-key',
    privateKey: 'generated-private-key',
  }),
  getPublicKey: vi.fn().mockReturnValue('test-public-key'),
})

describe('push notification provider', () => {
  let setProvider: typeof ProviderModule.setProvider
  let getProvider: typeof ProviderModule.getProvider
  let hasProvider: typeof ProviderModule.hasProvider
  let requireProvider: typeof ProviderModule.requireProvider
  let send: typeof ProviderModule.send
  let sendMany: typeof ProviderModule.sendMany
  let configure: typeof ProviderModule.configure
  let generateVapidKeys: typeof ProviderModule.generateVapidKeys
  let getPublicKey: typeof ProviderModule.getPublicKey

  beforeEach(async () => {
    vi.resetModules()

    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    requireProvider = providerModule.requireProvider
    send = providerModule.send
    sendMany = providerModule.sendMany
    configure = providerModule.configure
    generateVapidKeys = providerModule.generateVapidKeys
    getPublicKey = providerModule.getPublicKey
  })

  describe('setProvider', () => {
    it('should bond a provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      expect(hasProvider()).toBe(true)
      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('getProvider', () => {
    it('should return undefined when no provider is bonded', () => {
      expect(getProvider()).toBeUndefined()
    })

    it('should return the bonded provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('hasProvider', () => {
    it('should return false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should return true when a provider is bonded', () => {
      setProvider(createMockProvider())

      expect(hasProvider()).toBe(true)
    })
  })

  describe('requireProvider', () => {
    it('should throw when no provider is bonded', () => {
      expect(() => requireProvider()).toThrow(/No push notification provider bonded/)
    })

    it('should return the bonded provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)

      expect(requireProvider()).toBe(mockProvider)
    })
  })

  describe('convenience delegates', () => {
    it('should throw when calling delegates without a bonded provider', () => {
      expect(() => configure()).toThrow(/No push notification provider bonded/)
      expect(() => send(mockSubscription, mockPayload)).toThrow(
        /No push notification provider bonded/,
      )
      expect(() => sendMany([mockSubscription], mockPayload)).toThrow(
        /No push notification provider bonded/,
      )
      expect(() => generateVapidKeys()).toThrow(/No push notification provider bonded/)
      expect(() => getPublicKey()).toThrow(/No push notification provider bonded/)
    })

    describe('with bonded provider', () => {
      let mockProvider: PushNotificationProvider

      beforeEach(() => {
        mockProvider = createMockProvider()
        setProvider(mockProvider)
      })

      it('should delegate configure to provider', () => {
        const config = {
          email: 'test@example.com',
          publicKey: 'pub-key',
          privateKey: 'priv-key',
        }

        configure(config)

        expect(mockProvider.configure).toHaveBeenCalledWith(config)
      })

      it('should delegate configure without args to provider', () => {
        configure()

        expect(mockProvider.configure).toHaveBeenCalledWith(undefined)
      })

      it('should delegate send to provider', async () => {
        const result = await send(mockSubscription, mockPayload)

        expect(mockProvider.send).toHaveBeenCalledWith(mockSubscription, mockPayload)
        expect(result).toEqual({ statusCode: 201, headers: {}, body: '' })
      })

      it('should delegate sendMany to provider', async () => {
        const subscriptions = [mockSubscription]

        await sendMany(subscriptions, mockPayload)

        expect(mockProvider.sendMany).toHaveBeenCalledWith(subscriptions, mockPayload)
      })

      it('should delegate generateVapidKeys to provider', () => {
        const keys = generateVapidKeys()

        expect(mockProvider.generateVapidKeys).toHaveBeenCalled()
        expect(keys).toEqual({
          publicKey: 'generated-public-key',
          privateKey: 'generated-private-key',
        })
      })

      it('should delegate getPublicKey to provider', () => {
        const key = getPublicKey()

        expect(mockProvider.getPublicKey).toHaveBeenCalled()
        expect(key).toBe('test-public-key')
      })
    })
  })

  describe('provider replacement', () => {
    it('should use the most recently bonded provider', () => {
      const provider1 = createMockProvider()
      const provider2 = createMockProvider()
      vi.mocked(provider2.getPublicKey).mockReturnValue('second-key')

      setProvider(provider1)
      expect(getPublicKey()).toBe('test-public-key')

      setProvider(provider2)
      expect(getPublicKey()).toBe('second-key')

      expect(provider1.getPublicKey).toHaveBeenCalledTimes(1)
      expect(provider2.getPublicKey).toHaveBeenCalledTimes(1)
    })
  })
})

describe('push notification types', () => {
  it('should define PushSubscription interface', () => {
    const subscription: PushSubscription = {
      endpoint: 'https://example.com/push',
      keys: {
        p256dh: 'key1',
        auth: 'key2',
      },
    }

    expect(subscription.endpoint).toBe('https://example.com/push')
    expect(subscription.keys.p256dh).toBe('key1')
    expect(subscription.keys.auth).toBe('key2')
  })

  it('should define NotificationPayload with optional options', () => {
    const minimal: NotificationPayload = { title: 'Hello' }
    expect(minimal.title).toBe('Hello')
    expect(minimal.options).toBeUndefined()

    const full: NotificationPayload = {
      title: 'Full Notification',
      options: {
        body: 'Body text',
        icon: '/icon.png',
        badge: '/badge.png',
        image: '/image.png',
        tag: 'test-tag',
        data: { key: 'value' },
        actions: [
          { action: 'open', title: 'Open' },
          { action: 'dismiss', title: 'Dismiss', icon: '/dismiss.png' },
        ],
        requireInteraction: true,
        silent: false,
      },
    }

    expect(full.options?.body).toBe('Body text')
    expect(full.options?.actions).toHaveLength(2)
  })

  it('should define PushNotificationProvider interface', () => {
    const provider: PushNotificationProvider = {
      configure: () => {},
      send: async () => ({ statusCode: 201, headers: {}, body: '' }),
      sendMany: async () => [],
      generateVapidKeys: () => ({ publicKey: 'pub', privateKey: 'priv' }),
      getPublicKey: () => 'pub',
    }

    expect(typeof provider.configure).toBe('function')
    expect(typeof provider.send).toBe('function')
    expect(typeof provider.sendMany).toBe('function')
    expect(typeof provider.generateVapidKeys).toBe('function')
    expect(typeof provider.getPublicKey).toBe('function')
  })
})
