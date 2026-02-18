/**
 * Tests for SendGrid email provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @sendgrid/mail before importing the module
const mockSend = vi.fn()
const mockSetApiKey = vi.fn()

vi.mock('@sendgrid/mail', () => ({
  default: {
    send: mockSend,
    setApiKey: mockSetApiKey,
  },
}))

vi.mock('@molecule/api-emails', () => ({}))

describe('SendGrid Email Provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.SENDGRID_API_KEY = 'test-sendgrid-api-key'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('sendMail', () => {
    it('should send an email successfully', async () => {
      mockSend.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'test-message-id' }, body: '' },
        {},
      ])

      const { sendMail } = await import('../sendMail.js')

      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>',
      }

      const result = await sendMail(message)

      expect(mockSend).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        accepted: ['recipient@example.com'],
        rejected: [],
        messageId: 'test-message-id',
        response: '202',
      })
    })

    it('should handle missing x-message-id header', async () => {
      mockSend.mockResolvedValue([{ statusCode: 202, headers: {}, body: '' }, {}])

      const { sendMail } = await import('../sendMail.js')

      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      }

      const result = await sendMail(message)

      expect(result.accepted).toEqual(['recipient@example.com'])
      expect(result.rejected).toEqual([])
      expect(result.messageId).toBeUndefined()
    })

    it('should handle send failure', async () => {
      const error = new Error('SendGrid API error')
      mockSend.mockRejectedValue(error)

      const { sendMail } = await import('../sendMail.js')

      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      }

      await expect(sendMail(message)).rejects.toThrow('SendGrid API error')
    })

    it('should handle multiple recipients', async () => {
      mockSend.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'test-message-id' }, body: '' },
        {},
      ])

      const { sendMail } = await import('../sendMail.js')

      const message = {
        from: 'sender@example.com',
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Test Subject',
        text: 'Test body',
      }

      const result = await sendMail(message)

      expect(result.accepted).toEqual(['recipient1@example.com', 'recipient2@example.com'])
      expect(result.rejected).toEqual([])
    })

    it('should handle EmailAddress objects', async () => {
      mockSend.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'msg-1' }, body: '' },
        {},
      ])

      const { sendMail } = await import('../sendMail.js')

      const message = {
        from: { name: 'Sender', address: 'sender@example.com' },
        to: { name: 'Recipient', address: 'recipient@example.com' },
        subject: 'Test Subject',
        text: 'Test body',
      }

      const result = await sendMail(message)

      expect(result.accepted).toEqual(['recipient@example.com'])
      const sentMsg = mockSend.mock.calls[0][0]
      expect(sentMsg.from).toEqual({ email: 'sender@example.com', name: 'Sender' })
      expect(sentMsg.to).toEqual([{ email: 'recipient@example.com', name: 'Recipient' }])
    })
  })

  describe('provider', () => {
    it('should implement EmailTransport interface', async () => {
      const { provider } = await import('../provider.js')

      expect(provider).toBeDefined()
      expect(provider.sendMail).toBeDefined()
      expect(typeof provider.sendMail).toBe('function')
    })

    it('should have sendMail function that works', async () => {
      mockSend.mockResolvedValue([
        { statusCode: 202, headers: { 'x-message-id': 'test-message-id' }, body: '' },
        {},
      ])

      const { provider } = await import('../provider.js')

      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      }

      const result = await provider.sendMail(message)

      expect(result.messageId).toBe('test-message-id')
    })
  })

  describe('transport', () => {
    it('should export sgClient', async () => {
      const { sgClient } = await import('../transport.js')

      expect(sgClient).toBeDefined()
      expect(sgClient.send).toBeDefined()
      expect(sgClient.setApiKey).toBeDefined()
    })
  })

  describe('environment variable handling', () => {
    it('should call setApiKey when SENDGRID_API_KEY is set', async () => {
      vi.resetModules()

      await import('../transport.js')

      expect(mockSetApiKey).toHaveBeenCalledWith('test-sendgrid-api-key')
    })

    it('should not call setApiKey when SENDGRID_API_KEY is missing', async () => {
      delete process.env.SENDGRID_API_KEY
      vi.resetModules()
      mockSetApiKey.mockClear()

      await import('../transport.js')

      expect(mockSetApiKey).not.toHaveBeenCalled()
    })
  })

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.sendMail).toBeDefined()
      expect(exports.provider).toBeDefined()
      expect(exports.sgClient).toBeDefined()
    })
  })
})
