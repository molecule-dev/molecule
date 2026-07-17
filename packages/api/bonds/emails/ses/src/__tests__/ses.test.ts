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

// Mock AWS SDK (nodemailer 7 requires the SESv2 client + SendEmailCommand pair)
const mockSESClient = vi.fn()
vi.mock('@aws-sdk/client-sesv2', () => ({
  SESv2Client: mockSESClient,
  SendEmailCommand: vi.fn(),
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

  describe('SES client (lazy — constructed on first use, not import)', () => {
    it('should export getSesClient', async () => {
      const { getSesClient } = await import('../provider.js')

      expect(getSesClient).toBeDefined()
      expect(typeof getSesClient).toBe('function')
      expect(getSesClient()).toBeDefined()
    })

    it('does NOT construct the SES client at import time — only on first use', async () => {
      vi.resetModules()
      mockSESClient.mockClear()

      const { getSesClient } = await import('../provider.js')
      // Import must not read env / build the client.
      expect(mockSESClient).not.toHaveBeenCalled()

      getSesClient()
      expect(mockSESClient).toHaveBeenCalledTimes(1)
    })

    it('constructs the SES client once across repeated calls', async () => {
      vi.resetModules()
      mockSESClient.mockClear()

      const { getSesClient } = await import('../provider.js')
      getSesClient()
      getSesClient()
      getSesClient()

      expect(mockSESClient).toHaveBeenCalledTimes(1)
    })

    it('should configure SES client with region from environment on first use', async () => {
      process.env.AWS_SES_REGION = 'eu-west-1'
      vi.resetModules()

      const { getSesClient } = await import('../provider.js')
      getSesClient()

      expect(mockSESClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'eu-west-1',
        }),
      )
    })

    it('honors AWS_SES_REGION resolved AFTER import (late secrets), not the import-time value', async () => {
      // Simulate late secrets resolution: the region is ABSENT when the bond is
      // imported and only lands in process.env afterwards. The lazy client must
      // be constructed with the region present at first send.
      delete process.env.AWS_SES_REGION
      vi.resetModules()
      mockSESClient.mockClear()

      const { sendMail } = await import('../provider.js')

      // Import saw no region and did not construct the client.
      expect(mockSESClient).not.toHaveBeenCalled()

      // The real region arrives late, before the first send.
      process.env.AWS_SES_REGION = 'eu-central-1'
      mockSendMail.mockResolvedValue({
        envelope: { to: ['recipient@example.com'] },
        messageId: 'late-id',
        response: '250 OK',
      })

      await sendMail({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'body',
      })

      // The client was constructed with the LATE region at first send —
      // never the default `us-east-1` frozen at import.
      expect(mockSESClient).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'eu-central-1' }),
      )
      expect(mockSESClient).not.toHaveBeenCalledWith(
        expect.objectContaining({ region: 'us-east-1' }),
      )
    })

    it('should use default region when AWS_SES_REGION is not set', async () => {
      delete process.env.AWS_SES_REGION
      vi.resetModules()

      const { getSesClient } = await import('../provider.js')
      getSesClient()

      expect(mockSESClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1',
        }),
      )
    })

    it('should pass endpoint when AWS_SES_ENDPOINT is set on first use', async () => {
      process.env.AWS_SES_ENDPOINT = 'https://broker.example.com'
      vi.resetModules()

      const { getSesClient } = await import('../provider.js')
      getSesClient()

      expect(mockSESClient).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://broker.example.com',
        }),
      )
    })

    it('should not set endpoint when AWS_SES_ENDPOINT is unset', async () => {
      delete process.env.AWS_SES_ENDPOINT
      vi.resetModules()
      mockSESClient.mockClear()

      const { getSesClient } = await import('../provider.js')
      getSesClient()

      const config = mockSESClient.mock.calls[0][0] as Record<string, unknown>
      expect(config).not.toHaveProperty('endpoint')
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

      expect(exports.getSesClient).toBeDefined()
      expect(exports.sendMail).toBeDefined()
      expect(exports.provider).toBeDefined()
      expect(exports.transport).toBeDefined()
      expect(exports.email).toBeDefined()
    })

    it('registers AWS_ACCESS_KEY_ID in the @molecule/api-secrets registry when the barrel is imported', async () => {
      await import('../index.js')
      const { getSecretDefinition } = await import('@molecule/api-secrets')
      expect(getSecretDefinition('AWS_ACCESS_KEY_ID')).toBeDefined()
    })
  })
})
