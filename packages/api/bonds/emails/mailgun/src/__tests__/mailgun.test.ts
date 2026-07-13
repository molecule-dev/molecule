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

    it('falls back to the message recipients when the transport reports no accepted list', async () => {
      // The REAL nodemailer-mailgun-transport resolves with the raw mailgun.js
      // response ({ id, message, status } + messageId) — no accepted/rejected.
      // A queued message must still report its recipients as accepted.
      const mockResult = {
        id: '<test-message-id@test.mailgun.org>',
        message: 'Queued. Thank you.',
        status: 200,
        messageId: '<test-message-id@test.mailgun.org>',
      }
      mockSendMail.mockResolvedValue(mockResult)

      const { sendMail } = await import('../provider.js')

      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        cc: { name: 'CC', address: 'cc@example.com' },
        subject: 'Test Subject',
        text: 'Test body',
      }

      const result = await sendMail(message)

      expect(result.accepted).toEqual(['recipient@example.com', 'cc@example.com'])
      expect(result.rejected).toEqual([])
      expect(result.messageId).toBe('<test-message-id@test.mailgun.org>')
      expect(result.response).toBe('Queued. Thank you.')
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
    it('should throw when MAILGUN_API_KEY is missing', async () => {
      delete process.env.MAILGUN_API_KEY
      vi.resetModules()

      const { sendMail } = await import('../provider.js')

      // Sending should throw because the API key is required
      await expect(sendMail({ to: 'test@test.com', subject: 'Test' })).rejects.toThrow(
        'MAILGUN_API_KEY is not set',
      )
    })

    it('tags the missing-key error as a config-missing 503 (statusCode + errorKey)', async () => {
      // The API middleware (classifyTaggedError) maps this to a clean 503 +
      // 'config.notConfigured' instead of an opaque 500.
      delete process.env.MAILGUN_API_KEY
      vi.resetModules()
      const { sendMail } = await import('../provider.js')
      let caught: unknown
      await sendMail({ to: 'test@test.com', subject: 'Test' }).catch((e: unknown) => {
        caught = e
      })
      expect((caught as { statusCode?: number }).statusCode).toBe(503)
      expect((caught as { errorKey?: string }).errorKey).toBe('config.notConfigured')
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

  describe('MAILGUN_API_HOST override', () => {
    it('should pass host to the transport when MAILGUN_API_HOST is set', async () => {
      process.env.MAILGUN_API_HOST = 'api.eu.mailgun.net'
      mockSendMail.mockResolvedValue({ accepted: [], rejected: [] })

      const mailgun = (await import('nodemailer-mailgun-transport')).default as ReturnType<
        typeof vi.fn
      >
      const { sendMail } = await import('../provider.js')

      await sendMail({ to: 'test@test.com', subject: 'Test', text: 'x' })

      expect(mailgun).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: { api_key: 'test-mailgun-api-key', domain: 'test.mailgun.org' },
          host: 'api.eu.mailgun.net',
        }),
      )
    })

    it('should not set host when MAILGUN_API_HOST is unset', async () => {
      delete process.env.MAILGUN_API_HOST
      mockSendMail.mockResolvedValue({ accepted: [], rejected: [] })

      const mailgun = (await import('nodemailer-mailgun-transport')).default as ReturnType<
        typeof vi.fn
      >
      const { sendMail } = await import('../provider.js')

      await sendMail({ to: 'test@test.com', subject: 'Test', text: 'x' })

      const opts = mailgun.mock.calls[0][0] as Record<string, unknown>
      expect(opts).not.toHaveProperty('host')
      expect(opts).toEqual({
        auth: { api_key: 'test-mailgun-api-key', domain: 'test.mailgun.org' },
      })
    })
  })
})
