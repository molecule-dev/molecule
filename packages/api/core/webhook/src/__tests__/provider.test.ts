import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  PaginationOptions,
  WebhookDelivery,
  WebhookDeliveryResult,
  WebhookOptions,
  WebhookProvider,
  WebhookRegistration,
} from '../types.js'
import type * as WebhookModule from '../webhook.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let register: typeof WebhookModule.register
let unregister: typeof WebhookModule.unregister
let dispatch: typeof WebhookModule.dispatch
let list: typeof WebhookModule.list
let getDeliveryLog: typeof WebhookModule.getDeliveryLog
let retry: typeof WebhookModule.retry

describe('webhook provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    const webhookModule = await import('../webhook.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    register = webhookModule.register
    unregister = webhookModule.unregister
    dispatch = webhookModule.dispatch
    list = webhookModule.list
    getDeliveryLog = webhookModule.getDeliveryLog
    retry = webhookModule.retry
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Webhook provider not configured. Call setProvider() first.',
      )
    })

    it('should report no provider via hasProvider', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should report provider via hasProvider after setting', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })
  })

  describe('register', () => {
    it('should throw when no provider is set', async () => {
      await expect(register('https://example.com', ['event.a'])).rejects.toThrow(
        'Webhook provider not configured',
      )
    })

    it('should delegate to provider', async () => {
      const registration = createMockRegistration()
      const mockProvider = createMockProvider({
        register: vi.fn().mockResolvedValue(registration),
      })
      setProvider(mockProvider)

      const res = await register('https://example.com', ['event.a'])
      expect(res).toBe(registration)
      expect(mockProvider.register).toHaveBeenCalledWith(
        'https://example.com',
        ['event.a'],
        undefined,
      )
    })

    it('should pass options', async () => {
      const options: WebhookOptions = {
        secret: 'my-secret',
        headers: { 'X-Custom': 'value' },
        retryCount: 5,
      }
      const registration = createMockRegistration()
      const mockProvider = createMockProvider({
        register: vi.fn().mockResolvedValue(registration),
      })
      setProvider(mockProvider)

      await register('https://example.com', ['event.a', 'event.b'], options)
      expect(mockProvider.register).toHaveBeenCalledWith(
        'https://example.com',
        ['event.a', 'event.b'],
        options,
      )
    })
  })

  describe('unregister', () => {
    it('should throw when no provider is set', async () => {
      await expect(unregister('wh-1')).rejects.toThrow('Webhook provider not configured')
    })

    it('should delegate to provider', async () => {
      const mockProvider = createMockProvider({
        unregister: vi.fn().mockResolvedValue(undefined),
      })
      setProvider(mockProvider)

      await unregister('wh-1')
      expect(mockProvider.unregister).toHaveBeenCalledWith('wh-1')
    })
  })

  describe('dispatch', () => {
    it('should throw when no provider is set', async () => {
      await expect(dispatch('event.a', {})).rejects.toThrow('Webhook provider not configured')
    })

    it('should delegate to provider', async () => {
      const deliveryResults: WebhookDeliveryResult[] = [
        { webhookId: 'wh-1', deliveryId: 'd-1', status: 200, success: true, duration: 150 },
      ]
      const mockProvider = createMockProvider({
        dispatch: vi.fn().mockResolvedValue(deliveryResults),
      })
      setProvider(mockProvider)

      const res = await dispatch('event.a', { key: 'value' })
      expect(res).toEqual(deliveryResults)
      expect(mockProvider.dispatch).toHaveBeenCalledWith('event.a', { key: 'value' })
    })
  })

  describe('list', () => {
    it('should throw when no provider is set', async () => {
      await expect(list()).rejects.toThrow('Webhook provider not configured')
    })

    it('should delegate to provider', async () => {
      const registrations = [createMockRegistration(), createMockRegistration({ id: 'wh-2' })]
      const mockProvider = createMockProvider({
        list: vi.fn().mockResolvedValue(registrations),
      })
      setProvider(mockProvider)

      const res = await list()
      expect(res).toEqual(registrations)
    })
  })

  describe('getDeliveryLog', () => {
    it('should throw when no provider is set', async () => {
      await expect(getDeliveryLog('wh-1')).rejects.toThrow('Webhook provider not configured')
    })

    it('should delegate to provider', async () => {
      const deliveries: WebhookDelivery[] = [
        {
          id: 'd-1',
          webhookId: 'wh-1',
          event: 'event.a',
          payload: { key: 'value' },
          status: 200,
          success: true,
          duration: 100,
          createdAt: new Date('2026-03-28T00:00:00Z'),
        },
      ]
      const mockProvider = createMockProvider({
        getDeliveryLog: vi.fn().mockResolvedValue(deliveries),
      })
      setProvider(mockProvider)

      const res = await getDeliveryLog('wh-1')
      expect(res).toEqual(deliveries)
      expect(mockProvider.getDeliveryLog).toHaveBeenCalledWith('wh-1', undefined)
    })

    it('should pass pagination options', async () => {
      const options: PaginationOptions = { limit: 10, offset: 20 }
      const mockProvider = createMockProvider({
        getDeliveryLog: vi.fn().mockResolvedValue([]),
      })
      setProvider(mockProvider)

      await getDeliveryLog('wh-1', options)
      expect(mockProvider.getDeliveryLog).toHaveBeenCalledWith('wh-1', options)
    })
  })

  describe('retry', () => {
    it('should throw when no provider is set', async () => {
      await expect(retry('d-1')).rejects.toThrow('Webhook provider not configured')
    })

    it('should delegate to provider', async () => {
      const result: WebhookDeliveryResult = {
        webhookId: 'wh-1',
        deliveryId: 'd-1',
        status: 200,
        success: true,
        duration: 120,
      }
      const mockProvider = createMockProvider({
        retry: vi.fn().mockResolvedValue(result),
      })
      setProvider(mockProvider)

      const res = await retry('d-1')
      expect(res).toEqual(result)
      expect(mockProvider.retry).toHaveBeenCalledWith('d-1')
    })
  })
})

describe('webhook types', () => {
  it('should export WebhookRegistration type', () => {
    const registration: WebhookRegistration = createMockRegistration()
    expect(registration.id).toBe('wh-1')
    expect(registration.active).toBe(true)
  })

  it('should export WebhookDeliveryResult type', () => {
    const result: WebhookDeliveryResult = {
      webhookId: 'wh-1',
      deliveryId: 'd-1',
      status: 200,
      success: true,
      duration: 150,
    }
    expect(result.success).toBe(true)
  })

  it('should export WebhookOptions type with all optional fields', () => {
    const options: WebhookOptions = {
      secret: 'sec',
      headers: { 'X-Token': 'abc' },
      retryCount: 5,
    }
    expect(options.retryCount).toBe(5)
  })

  it('should export WebhookOptions type with no fields', () => {
    const options: WebhookOptions = {}
    expect(options.secret).toBeUndefined()
  })

  it('should export PaginationOptions type', () => {
    const options: PaginationOptions = { limit: 10, offset: 0 }
    expect(options.limit).toBe(10)
  })

  it('should export WebhookDelivery type', () => {
    const delivery: WebhookDelivery = {
      id: 'd-1',
      webhookId: 'wh-1',
      event: 'event.a',
      payload: { data: true },
      status: 200,
      success: true,
      duration: 100,
      createdAt: new Date(),
    }
    expect(delivery.event).toBe('event.a')
  })

  it('should export WebhookProvider type', () => {
    const provider: WebhookProvider = createMockProvider()
    expect(typeof provider.register).toBe('function')
    expect(typeof provider.unregister).toBe('function')
    expect(typeof provider.dispatch).toBe('function')
    expect(typeof provider.list).toBe('function')
    expect(typeof provider.getDeliveryLog).toBe('function')
    expect(typeof provider.retry).toBe('function')
  })
})

function createMockRegistration(overrides?: Partial<WebhookRegistration>): WebhookRegistration {
  return {
    id: 'wh-1',
    url: 'https://example.com/hook',
    events: ['event.a'],
    secret: 'secret-123',
    active: true,
    createdAt: new Date('2026-03-28T00:00:00Z'),
    ...overrides,
  }
}

function createMockProvider(overrides?: Partial<WebhookProvider>): WebhookProvider {
  return {
    register: vi.fn().mockResolvedValue(createMockRegistration()),
    unregister: vi.fn().mockResolvedValue(undefined),
    dispatch: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([]),
    getDeliveryLog: vi.fn().mockResolvedValue([]),
    retry: vi.fn().mockResolvedValue({
      webhookId: 'wh-1',
      deliveryId: 'd-1',
      status: 200,
      success: true,
      duration: 100,
    }),
    ...overrides,
  }
}
