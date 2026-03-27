import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SMSProvider } from '@molecule/api-sms'

/* ------------------------------------------------------------------ */
/*  Mock Twilio                                                        */
/* ------------------------------------------------------------------ */

const { mockCreate, mockFetch, MockTwilio } = vi.hoisted(() => {
  const mockCreate = vi.fn()
  const mockFetch = vi.fn()

  const mockMessages = vi.fn().mockImplementation((sid?: string) => {
    if (sid) {
      return { fetch: mockFetch }
    }
    return undefined
  })
  mockMessages.create = mockCreate

  const MockTwilio = vi.fn().mockReturnValue({
    messages: mockMessages,
  })

  return { mockCreate, mockFetch, MockTwilio }
})

vi.mock('twilio', () => ({
  default: MockTwilio,
}))

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('@molecule/api-sms-twilio', () => {
  let provider: SMSProvider

  beforeEach(async () => {
    vi.clearAllMocks()

    process.env.TWILIO_ACCOUNT_SID = 'ACtest123'
    process.env.TWILIO_AUTH_TOKEN = 'token123'
    process.env.TWILIO_FROM_NUMBER = '+15550001111'

    const { createProvider } = await import('../provider.js')
    provider = createProvider()
  })

  describe('createProvider', () => {
    it('creates a Twilio client with provided credentials', () => {
      expect(MockTwilio).toHaveBeenCalledWith('ACtest123', 'token123')
    })

    it('accepts explicit config over env vars', async () => {
      vi.clearAllMocks()
      const { createProvider } = await import('../provider.js')
      createProvider({
        accountSid: 'ACexplicit',
        authToken: 'explicitToken',
        defaultFrom: '+15559999999',
      })
      expect(MockTwilio).toHaveBeenCalledWith('ACexplicit', 'explicitToken')
    })

    it('throws when accountSid is missing', async () => {
      delete process.env.TWILIO_ACCOUNT_SID
      const { createProvider } = await import('../provider.js')
      expect(() => createProvider({ authToken: 'token' })).toThrow('accountSid is required')
    })

    it('throws when authToken is missing', async () => {
      delete process.env.TWILIO_AUTH_TOKEN
      const { createProvider } = await import('../provider.js')
      expect(() => createProvider({ accountSid: 'ACtest' })).toThrow('authToken is required')
    })
  })

  describe('send', () => {
    it('sends an SMS message via Twilio', async () => {
      mockCreate.mockResolvedValueOnce({
        sid: 'SM123',
        status: 'queued',
        to: '+15552223333',
      })

      const result = await provider.send('+15552223333', 'Hello!')

      expect(mockCreate).toHaveBeenCalledWith({
        to: '+15552223333',
        from: '+15550001111',
        body: 'Hello!',
      })
      expect(result).toEqual({
        id: 'SM123',
        status: 'queued',
        to: '+15552223333',
      })
    })

    it('uses options.from over default', async () => {
      mockCreate.mockResolvedValueOnce({
        sid: 'SM456',
        status: 'queued',
        to: '+15552223333',
      })

      await provider.send('+15552223333', 'Hello!', { from: '+15559998888' })

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ from: '+15559998888' }))
    })

    it('includes scheduledAt when provided', async () => {
      const scheduledAt = new Date('2026-04-01T12:00:00Z')
      mockCreate.mockResolvedValueOnce({
        sid: 'SM789',
        status: 'queued',
        to: '+15552223333',
      })

      await provider.send('+15552223333', 'Scheduled!', { scheduledAt })

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          sendAt: scheduledAt,
          scheduleType: 'fixed',
        }),
      )
    })

    it('includes statusCallback when callbackUrl is provided', async () => {
      mockCreate.mockResolvedValueOnce({
        sid: 'SM101',
        status: 'queued',
        to: '+15552223333',
      })

      await provider.send('+15552223333', 'Callback!', {
        callbackUrl: 'https://example.com/webhook',
      })

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCallback: 'https://example.com/webhook',
        }),
      )
    })

    it('throws when no from number is available', async () => {
      delete process.env.TWILIO_FROM_NUMBER
      const { createProvider } = await import('../provider.js')
      const p = createProvider({
        accountSid: 'ACtest',
        authToken: 'token',
      })

      await expect(p.send('+15552223333', 'No from!')).rejects.toThrow('sender number is required')
    })

    it('normalises Twilio status "accepted" to "queued"', async () => {
      mockCreate.mockResolvedValueOnce({
        sid: 'SM200',
        status: 'accepted',
        to: '+15552223333',
      })

      const result = await provider.send('+15552223333', 'Test')
      expect(result.status).toBe('queued')
    })

    it('normalises Twilio status "sending" to "sent"', async () => {
      mockCreate.mockResolvedValueOnce({
        sid: 'SM201',
        status: 'sending',
        to: '+15552223333',
      })

      const result = await provider.send('+15552223333', 'Test')
      expect(result.status).toBe('sent')
    })

    it('normalises Twilio status "undelivered" to "failed"', async () => {
      mockCreate.mockResolvedValueOnce({
        sid: 'SM202',
        status: 'undelivered',
        to: '+15552223333',
      })

      const result = await provider.send('+15552223333', 'Test')
      expect(result.status).toBe('failed')
    })
  })

  describe('sendBulk', () => {
    it('sends multiple messages and aggregates results', async () => {
      mockCreate
        .mockResolvedValueOnce({ sid: 'SM1', status: 'queued', to: '+1111' })
        .mockResolvedValueOnce({ sid: 'SM2', status: 'queued', to: '+2222' })
        .mockResolvedValueOnce({ sid: 'SM3', status: 'queued', to: '+3333' })

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
      mockCreate
        .mockResolvedValueOnce({ sid: 'SM1', status: 'queued', to: '+1111' })
        .mockRejectedValueOnce(new Error('Twilio error'))
        .mockResolvedValueOnce({ sid: 'SM3', status: 'queued', to: '+3333' })

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
      mockCreate.mockResolvedValueOnce({ sid: 'SM1', status: 'queued', to: '+1111' })

      await provider.sendBulk([{ to: '+1111', message: 'A', options: { from: '+15559998888' } }])

      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ from: '+15559998888' }))
    })
  })

  describe('getStatus', () => {
    it('fetches message status from Twilio', async () => {
      mockFetch.mockResolvedValueOnce({
        sid: 'SM123',
        status: 'delivered',
        dateUpdated: new Date('2026-03-27T10:00:00Z'),
        errorMessage: null,
      })

      const status = await provider.getStatus('SM123')

      expect(status).toEqual({
        id: 'SM123',
        status: 'delivered',
        deliveredAt: new Date('2026-03-27T10:00:00Z'),
      })
    })

    it('includes error message when present', async () => {
      mockFetch.mockResolvedValueOnce({
        sid: 'SM456',
        status: 'failed',
        dateUpdated: null,
        errorMessage: 'Invalid phone number',
      })

      const status = await provider.getStatus('SM456')

      expect(status).toEqual({
        id: 'SM456',
        status: 'failed',
        error: 'Invalid phone number',
      })
    })

    it('omits deliveredAt and error when not present', async () => {
      mockFetch.mockResolvedValueOnce({
        sid: 'SM789',
        status: 'queued',
        dateUpdated: null,
        errorMessage: null,
      })

      const status = await provider.getStatus('SM789')

      expect(status).toEqual({
        id: 'SM789',
        status: 'queued',
      })
    })
  })
})
