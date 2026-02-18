/**
 * Tests for Mailgun email provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock nodemailer before importing the module
const mockSendMail = vi.fn()
const mockCreateTransport = vi.fn(() => ({
  sendMail: mockSendMail,
}))

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}))

vi.mock('nodemailer-mailgun-transport', () => ({
  default: vi.fn((config) => config),
}))

vi.mock('@molecule/api-emails', () => ({
  // Type exports only, no runtime values needed
}))

describe('Mailgun Email Provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.MAILGUN_API_KEY = 'test-mailgun-api-key'
    process.env.MAILGUN_DOMAIN = 'test.mailgun.org'
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  describe('sendMail', () => {
    it('should send an email successfully', async () => {
      const mockResult = {
        accepted: ['recipient@example.com'],
        rejected: [],
        messageId: 'test-message-id',
        response: '250 OK',
      }
      mockSendMail.mockResolvedValue(mockResult)

      const { sendMail } = await import('../provider.js')

      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>',
      }

      const result = await sendMail(message)

      expect(mockSendMail).toHaveBeenCalledWith(message)
      expect(result).toEqual({
        accepted: ['recipient@example.com'],
        rejected: [],
        messageId: 'test-message-id',
        response: '250 OK',
      })
    })

    it('should handle empty accepted and rejected arrays', async () => {
      const mockResult = {
        accepted: undefined,
        rejected: undefined,
        messageId: 'test-message-id',
        response: '250 OK',
      }
      mockSendMail.mockResolvedValue(mockResult)

      const { sendMail } = await import('../provider.js')

      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      }

      const result = await sendMail(message)

      expect(result.accepted).toEqual([])
      expect(result.rejected).toEqual([])
    })

    it('should handle send failure', async () => {
      const error = new Error('Mailgun API error')
      mockSendMail.mockRejectedValue(error)

      const { sendMail } = await import('../provider.js')

      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      }

      await expect(sendMail(message)).rejects.toThrow('Mailgun API error')
    })

    it('should handle multiple recipients', async () => {
      const mockResult = {
        accepted: ['recipient1@example.com', 'recipient2@example.com'],
        rejected: ['invalid@example.com'],
        messageId: 'test-message-id',
        response: '250 OK',
      }
      mockSendMail.mockResolvedValue(mockResult)

      const { sendMail } = await import('../provider.js')

      const message = {
        from: 'sender@example.com',
        to: ['recipient1@example.com', 'recipient2@example.com', 'invalid@example.com'],
        subject: 'Test Subject',
        text: 'Test body',
      }

      const result = await sendMail(message)

      expect(result.accepted).toEqual(['recipient1@example.com', 'recipient2@example.com'])
      expect(result.rejected).toEqual(['invalid@example.com'])
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
      const mockResult = {
        accepted: ['recipient@example.com'],
        rejected: [],
        messageId: 'test-message-id',
        response: '250 OK',
      }
      mockSendMail.mockResolvedValue(mockResult)

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
    it('should export transport and email', async () => {
      const { transport, email } = await import('../provider.js')

      expect(transport).toBeDefined()
      expect(email).toBeDefined()
      expect(transport).toBe(email)
    })
  })

  describe('environment variable handling', () => {
    it('should use fallback key when MAILGUN_API_KEY is missing', async () => {
      delete process.env.MAILGUN_API_KEY
      vi.resetModules()

      await import('../provider.js')

      // The transport should be created even without the API key
      expect(mockCreateTransport).toHaveBeenCalled()
    })
  })

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.sendMail).toBeDefined()
      expect(exports.provider).toBeDefined()
      expect(exports.transport).toBeDefined()
      expect(exports.email).toBeDefined()
    })
  })
})
