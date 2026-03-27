import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SMSProvider } from '@molecule/api-sms'

/* ------------------------------------------------------------------ */
/*  Mock Vonage                                                        */
/* ------------------------------------------------------------------ */

const { mockSend, MockVonageClass } = vi.hoisted(() => {
  const mockSend = vi.fn()

  class MockVonageClass {
    static constructorCalls: unknown[][] = []
    sms = { send: mockSend }

    constructor(...args: unknown[]) {
      MockVonageClass.constructorCalls.push(args)
    }
  }

  return { mockSend, MockVonageClass }
})

vi.mock('@vonage/server-sdk', () => ({
  Vonage: MockVonageClass,
}))

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('@molecule/api-sms-vonage', () => {
  let provider: SMSProvider

  beforeEach(async () => {
    vi.clearAllMocks()
    MockVonageClass.constructorCalls = []

    process.env.VONAGE_API_KEY = 'test_key'
    process.env.VONAGE_API_SECRET = 'test_secret'
    process.env.VONAGE_FROM_NUMBER = '+15550001111'

    const { createProvider } = await import('../provider.js')
    provider = createProvider()
  })

  describe('createProvider', () => {
    it('creates a Vonage client with provided credentials', () => {
      expect(MockVonageClass.constructorCalls).toHaveLength(1)
      expect(MockVonageClass.constructorCalls[0][0]).toEqual({
        apiKey: 'test_key',
        apiSecret: 'test_secret',
      })
    })

    it('accepts explicit config over env vars', async () => {
      MockVonageClass.constructorCalls = []
      const { createProvider } = await import('../provider.js')
      createProvider({
        apiKey: 'explicit_key',
        apiSecret: 'explicit_secret',
        defaultFrom: '+15559999999',
      })
      expect(MockVonageClass.constructorCalls).toHaveLength(1)
      expect(MockVonageClass.constructorCalls[0][0]).toEqual({
        apiKey: 'explicit_key',
        apiSecret: 'explicit_secret',
      })
    })

    it('throws when apiKey is missing', async () => {
      delete process.env.VONAGE_API_KEY
      const { createProvider } = await import('../provider.js')
      expect(() => createProvider({ apiSecret: 'secret' })).toThrow('apiKey is required')
    })

    it('throws when apiSecret is missing', async () => {
      delete process.env.VONAGE_API_SECRET
      const { createProvider } = await import('../provider.js')
      expect(() => createProvider({ apiKey: 'key' })).toThrow('apiSecret is required')
    })
  })

  describe('send', () => {
    it('sends an SMS message via Vonage', async () => {
      mockSend.mockResolvedValueOnce({
        messageCount: 1,
        messages: [{ 'message-id': 'MSG123', status: '0', to: '+15552223333' }],
      })

      const result = await provider.send('+15552223333', 'Hello!')

      expect(mockSend).toHaveBeenCalledWith({
        to: '+15552223333',
        from: '+15550001111',
        text: 'Hello!',
      })
      expect(result).toEqual({
        id: 'MSG123',
        status: 'queued',
        to: '+15552223333',
      })
    })

    it('uses options.from over default', async () => {
      mockSend.mockResolvedValueOnce({
        messageCount: 1,
        messages: [{ 'message-id': 'MSG456', status: '0', to: '+15552223333' }],
      })

      await provider.send('+15552223333', 'Hello!', { from: '+15559998888' })

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ from: '+15559998888' }))
    })

    it('includes callback and statusReportReq when callbackUrl is provided', async () => {
      mockSend.mockResolvedValueOnce({
        messageCount: 1,
        messages: [{ 'message-id': 'MSG789', status: '0', to: '+15552223333' }],
      })

      await provider.send('+15552223333', 'Callback!', {
        callbackUrl: 'https://example.com/webhook',
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          callback: 'https://example.com/webhook',
          statusReportReq: true,
        }),
      )
    })

    it('throws when scheduledAt is provided', async () => {
      await expect(
        provider.send('+15552223333', 'Scheduled!', { scheduledAt: new Date() }),
      ).rejects.toThrow('does not support scheduled sending')
    })

    it('throws when no from number is available', async () => {
      delete process.env.VONAGE_FROM_NUMBER
      const { createProvider } = await import('../provider.js')
      const p = createProvider({
        apiKey: 'key',
        apiSecret: 'secret',
      })

      await expect(p.send('+15552223333', 'No from!')).rejects.toThrow('sender number is required')
    })

    it('maps Vonage status "0" to "queued"', async () => {
      mockSend.mockResolvedValueOnce({
        messageCount: 1,
        messages: [{ 'message-id': 'MSG200', status: '0', to: '+15552223333' }],
      })

      const result = await provider.send('+15552223333', 'Test')
      expect(result.status).toBe('queued')
    })

    it('maps non-zero Vonage status to "failed"', async () => {
      mockSend.mockResolvedValueOnce({
        messageCount: 1,
        messages: [
          { 'message-id': '', status: '4', to: '+15552223333', errorText: 'Invalid credentials' },
        ],
      })

      const result = await provider.send('+15552223333', 'Test')
      expect(result.status).toBe('failed')
    })

    it('handles missing message-id gracefully', async () => {
      mockSend.mockResolvedValueOnce({
        messageCount: 1,
        messages: [{ status: '0', to: '+15552223333' }],
      })

      const result = await provider.send('+15552223333', 'Test')
      expect(result.id).toBe('')
    })
  })

  describe('sendBulk', () => {
    it('sends multiple messages and aggregates results', async () => {
      mockSend
        .mockResolvedValueOnce({
          messageCount: 1,
          messages: [{ 'message-id': 'MSG1', status: '0', to: '+1111' }],
        })
        .mockResolvedValueOnce({
          messageCount: 1,
          messages: [{ 'message-id': 'MSG2', status: '0', to: '+2222' }],
        })
        .mockResolvedValueOnce({
          messageCount: 1,
          messages: [{ 'message-id': 'MSG3', status: '0', to: '+3333' }],
        })

      const result = await provider.sendBulk([
        { to: '+1111', message: 'A' },
        { to: '+2222', message: 'B' },
        { to: '+3333', message: 'C' },
      ])

      expect(result.total).toBe(3)
      expect(result.successful).toBe(3)
      expect(result.failed).toBe(0)
      expect(result.results).toHaveLength(3)
    })

    it('handles partial failures gracefully', async () => {
      mockSend
        .mockResolvedValueOnce({
          messageCount: 1,
          messages: [{ 'message-id': 'MSG1', status: '0', to: '+1111' }],
        })
        .mockRejectedValueOnce(new Error('Vonage error'))
        .mockResolvedValueOnce({
          messageCount: 1,
          messages: [{ 'message-id': 'MSG3', status: '0', to: '+3333' }],
        })

      const result = await provider.sendBulk([
        { to: '+1111', message: 'A' },
        { to: '+2222', message: 'B' },
        { to: '+3333', message: 'C' },
      ])

      expect(result.total).toBe(3)
      expect(result.successful).toBe(2)
      expect(result.failed).toBe(1)
      expect(result.results[1]).toEqual({ id: '', status: 'failed', to: '+2222' })
    })

    it('returns empty results for empty input', async () => {
      const result = await provider.sendBulk([])

      expect(result.total).toBe(0)
      expect(result.successful).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.results).toEqual([])
    })

    it('passes per-message options through', async () => {
      mockSend.mockResolvedValueOnce({
        messageCount: 1,
        messages: [{ 'message-id': 'MSG1', status: '0', to: '+1111' }],
      })

      await provider.sendBulk([{ to: '+1111', message: 'A', options: { from: '+15559998888' } }])

      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ from: '+15559998888' }))
    })

    it('counts Vonage-reported failures in failed tally', async () => {
      mockSend.mockResolvedValueOnce({
        messageCount: 1,
        messages: [{ 'message-id': '', status: '9', to: '+1111' }],
      })

      const result = await provider.sendBulk([{ to: '+1111', message: 'A' }])

      expect(result.failed).toBe(1)
      expect(result.successful).toBe(0)
    })
  })

  describe('getStatus', () => {
    it('throws with a helpful message about webhook-based delivery receipts', async () => {
      await expect(provider.getStatus('MSG123')).rejects.toThrow(
        'does not support message status polling',
      )
    })
  })
})
