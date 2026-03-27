import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type * as SmsModule from '../sms.js'
import type {
  BulkSMSMessage,
  BulkSMSResult,
  SMSOptions,
  SMSProvider,
  SMSResult,
  SMSStatus,
} from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let send: typeof SmsModule.send
let sendBulk: typeof SmsModule.sendBulk
let getStatus: typeof SmsModule.getStatus

describe('sms provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    const smsModule = await import('../sms.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    send = smsModule.send
    sendBulk = smsModule.sendBulk
    getStatus = smsModule.getStatus
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow('SMS provider not configured. Call setProvider() first.')
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

  describe('send', () => {
    it('should throw when no provider is set', async () => {
      await expect(send('+1234567890', 'Hello')).rejects.toThrow('SMS provider not configured')
    })

    it('should delegate to provider', async () => {
      const result: SMSResult = { id: 'msg-1', status: 'queued', to: '+1234567890' }
      const mockProvider = createMockProvider({ send: vi.fn().mockResolvedValue(result) })
      setProvider(mockProvider)

      const res = await send('+1234567890', 'Hello')
      expect(res).toBe(result)
      expect(mockProvider.send).toHaveBeenCalledWith('+1234567890', 'Hello', undefined)
    })

    it('should pass options', async () => {
      const options: SMSOptions = {
        from: '+0987654321',
        scheduledAt: new Date('2026-04-01'),
        callbackUrl: 'https://example.com/callback',
      }
      const result: SMSResult = { id: 'msg-2', status: 'queued', to: '+1234567890' }
      const mockProvider = createMockProvider({ send: vi.fn().mockResolvedValue(result) })
      setProvider(mockProvider)

      const res = await send('+1234567890', 'Scheduled message', options)
      expect(res).toEqual(result)
      expect(mockProvider.send).toHaveBeenCalledWith('+1234567890', 'Scheduled message', options)
    })
  })

  describe('sendBulk', () => {
    it('should throw when no provider is set', async () => {
      await expect(sendBulk([])).rejects.toThrow('SMS provider not configured')
    })

    it('should delegate to provider', async () => {
      const messages: BulkSMSMessage[] = [
        { to: '+1111111111', message: 'Hello 1' },
        { to: '+2222222222', message: 'Hello 2', options: { from: '+0000000000' } },
      ]
      const bulkResult: BulkSMSResult = {
        results: [
          { id: 'msg-1', status: 'queued', to: '+1111111111' },
          { id: 'msg-2', status: 'queued', to: '+2222222222' },
        ],
        total: 2,
        successful: 2,
        failed: 0,
      }
      const mockProvider = createMockProvider({
        sendBulk: vi.fn().mockResolvedValue(bulkResult),
      })
      setProvider(mockProvider)

      const res = await sendBulk(messages)
      expect(res).toEqual(bulkResult)
      expect(mockProvider.sendBulk).toHaveBeenCalledWith(messages)
    })
  })

  describe('getStatus', () => {
    it('should throw when no provider is set', async () => {
      await expect(getStatus('msg-1')).rejects.toThrow('SMS provider not configured')
    })

    it('should delegate to provider', async () => {
      const status: SMSStatus = {
        id: 'msg-1',
        status: 'delivered',
        deliveredAt: new Date('2026-03-27T12:00:00Z'),
      }
      const mockProvider = createMockProvider({
        getStatus: vi.fn().mockResolvedValue(status),
      })
      setProvider(mockProvider)

      const res = await getStatus('msg-1')
      expect(res).toEqual(status)
      expect(mockProvider.getStatus).toHaveBeenCalledWith('msg-1')
    })

    it('should return status with error for failed messages', async () => {
      const status: SMSStatus = {
        id: 'msg-2',
        status: 'failed',
        error: 'Invalid phone number',
      }
      const mockProvider = createMockProvider({
        getStatus: vi.fn().mockResolvedValue(status),
      })
      setProvider(mockProvider)

      const res = await getStatus('msg-2')
      expect(res.status).toBe('failed')
      expect(res.error).toBe('Invalid phone number')
      expect(res.deliveredAt).toBeUndefined()
    })
  })
})

describe('sms types', () => {
  it('should export SMSResult type', () => {
    const result: SMSResult = { id: 'msg-1', status: 'queued', to: '+1234567890' }
    expect(result.id).toBe('msg-1')
    expect(result.status).toBe('queued')
    expect(result.to).toBe('+1234567890')
  })

  it('should export SMSOptions type with all optional fields', () => {
    const options: SMSOptions = {
      from: '+0987654321',
      scheduledAt: new Date(),
      callbackUrl: 'https://example.com/callback',
    }
    expect(options.from).toBe('+0987654321')
  })

  it('should export SMSOptions type with no fields', () => {
    const options: SMSOptions = {}
    expect(options.from).toBeUndefined()
    expect(options.scheduledAt).toBeUndefined()
    expect(options.callbackUrl).toBeUndefined()
  })

  it('should export BulkSMSMessage type', () => {
    const message: BulkSMSMessage = {
      to: '+1234567890',
      message: 'Hello',
      options: { from: '+0987654321' },
    }
    expect(message.to).toBe('+1234567890')
    expect(message.message).toBe('Hello')
  })

  it('should export BulkSMSResult type', () => {
    const result: BulkSMSResult = {
      results: [{ id: 'msg-1', status: 'sent', to: '+1234567890' }],
      total: 1,
      successful: 1,
      failed: 0,
    }
    expect(result.total).toBe(1)
    expect(result.results).toHaveLength(1)
  })

  it('should export SMSStatus type', () => {
    const status: SMSStatus = {
      id: 'msg-1',
      status: 'delivered',
      deliveredAt: new Date(),
    }
    expect(status.id).toBe('msg-1')
    expect(status.deliveredAt).toBeInstanceOf(Date)
  })

  it('should export SMSStatus type without optional fields', () => {
    const status: SMSStatus = { id: 'msg-1', status: 'queued' }
    expect(status.deliveredAt).toBeUndefined()
    expect(status.error).toBeUndefined()
  })

  it('should export SMSProvider type', () => {
    const provider: SMSProvider = createMockProvider()
    expect(typeof provider.send).toBe('function')
    expect(typeof provider.sendBulk).toBe('function')
    expect(typeof provider.getStatus).toBe('function')
  })
})

function createMockProvider(overrides?: Partial<SMSProvider>): SMSProvider {
  return {
    send: vi.fn().mockResolvedValue({ id: 'msg-1', status: 'queued', to: '+1234567890' }),
    sendBulk: vi.fn().mockResolvedValue({ results: [], total: 0, successful: 0, failed: 0 }),
    getStatus: vi.fn().mockResolvedValue({ id: 'msg-1', status: 'queued' }),
    ...overrides,
  }
}
