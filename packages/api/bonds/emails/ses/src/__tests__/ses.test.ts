/**
 * Tests for AWS SES email provider.
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

// Mock AWS SDK
const mockSESClient = vi.fn()
vi.mock('@aws-sdk/client-ses', () => ({
  SESClient: mockSESClient,
}))

vi.mock('@aws-sdk/credential-provider-node', () => ({
  defaultProvider: vi.fn(),
}))

vi.mock('@molecule/api-emails', () => ({
  // Type exports only, no runtime values needed
}))

describe('AWS SES Email Provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    process.env.AWS_ACCESS_KEY_ID = 'test-aws-access-key-id'
    process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret-access-key'
    process.env.AWS_SES_REGION = 'us-west-2'
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
      const error = new Error('SES API error')
      mockSendMail.mockRejectedValue(error)

      const { sendMail } = await import('../provider.js')

      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      }

      await expect(sendMail(message)).rejects.toThrow('SES API error')
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

    it('should handle rate limit errors', async () => {
      const error = new Error('Throttling: Rate exceeded')
      mockSendMail.mockRejectedValue(error)

      const { sendMail } = await import('../provider.js')

      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      }

      await expect(sendMail(message)).rejects.toThrow('Throttling: Rate exceeded')
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

  describe('SES client', () => {
    it('should export ses client', async () => {
      const { ses } = await import('../provider.js')

      expect(ses).toBeDefined()
    })

    it('should configure SES client with region from environment', async () => {
      process.env.AWS_SES_REGION = 'eu-west-1'
      vi.resetModules()

      await import('../provider.js')

      expect(mockSESClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'eu-west-1',
        }),
      )
    })

    it('should use default region when AWS_SES_REGION is not set', async () => {
      delete process.env.AWS_SES_REGION
      vi.resetModules()

      await import('../provider.js')

      expect(mockSESClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1',
        }),
      )
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

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.ses).toBeDefined()
      expect(exports.sendMail).toBeDefined()
      expect(exports.provider).toBeDefined()
      expect(exports.transport).toBeDefined()
      expect(exports.email).toBeDefined()
    })
  })
})
