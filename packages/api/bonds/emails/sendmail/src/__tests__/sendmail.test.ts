/**
 * Tests for Sendmail email provider.
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

vi.mock('@molecule/api-emails', () => ({
  // Type exports only, no runtime values needed
}))

describe('Sendmail Email Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
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

      const { sendMail } = await import('../sendMail.js')

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

      const { sendMail } = await import('../sendMail.js')

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
      const error = new Error('Sendmail command failed')
      mockSendMail.mockRejectedValue(error)

      const { sendMail } = await import('../sendMail.js')

      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      }

      await expect(sendMail(message)).rejects.toThrow('Sendmail command failed')
    })

    it('should handle multiple recipients', async () => {
      const mockResult = {
        accepted: ['recipient1@example.com', 'recipient2@example.com'],
        rejected: ['invalid@example.com'],
        messageId: 'test-message-id',
        response: '250 OK',
      }
      mockSendMail.mockResolvedValue(mockResult)

      const { sendMail } = await import('../sendMail.js')

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

    it('should handle CC and BCC recipients', async () => {
      const mockResult = {
        accepted: ['to@example.com', 'cc@example.com', 'bcc@example.com'],
        rejected: [],
        messageId: 'test-message-id',
        response: '250 OK',
      }
      mockSendMail.mockResolvedValue(mockResult)

      const { sendMail } = await import('../sendMail.js')

      const message = {
        from: 'sender@example.com',
        to: 'to@example.com',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      }

      const result = await sendMail(message)

      expect(mockSendMail).toHaveBeenCalledWith(message)
      expect(result.accepted).toHaveLength(3)
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
    it('should export nodemailerTransport', async () => {
      const { nodemailerTransport, transport, email } = await import('../transport.js')

      expect(nodemailerTransport).toBeDefined()
      expect(transport).toBeDefined()
      expect(email).toBeDefined()
      expect(nodemailerTransport).toBe(transport)
      expect(nodemailerTransport).toBe(email)
    })

    it('should create transport with sendmail configuration', async () => {
      vi.resetModules()
      await import('../transport.js')

      expect(mockCreateTransport).toHaveBeenCalledWith({
        sendmail: true,
        newline: 'unix',
        path: '/usr/sbin/sendmail',
      })
    })
  })

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.sendMail).toBeDefined()
      expect(exports.provider).toBeDefined()
      expect(exports.nodemailerTransport).toBeDefined()
      expect(exports.transport).toBeDefined()
      expect(exports.email).toBeDefined()
    })
  })
})
