/**
 * Tests for SendGrid email provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock @sendgrid/mail before importing the module
const mockSend = vi.fn()
const mockSetApiKey = vi.fn()
const mockSetDefaultRequest = vi.fn()

vi.mock('@sendgrid/mail', () => ({
  default: {
    send: mockSend,
    setApiKey: mockSetApiKey,
    client: {
      setDefaultRequest: mockSetDefaultRequest,
    },
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
    it('should export getClient', async () => {
      const { getClient } = await import('../transport.js')

      expect(getClient).toBeDefined()
      expect(typeof getClient).toBe('function')
      const sgClient = getClient()
      expect(sgClient.send).toBeDefined()
      expect(sgClient.setApiKey).toBeDefined()
    })
  })

  describe('lazy configuration (env read at first use, not import)', () => {
    it('does NOT call setApiKey at import time — only on first getClient()', async () => {
      vi.resetModules()
      mockSetApiKey.mockClear()

      // Importing the module must NOT read env / configure the SDK.
      const { getClient } = await import('../transport.js')
      expect(mockSetApiKey).not.toHaveBeenCalled()

      // Configuration happens on first use.
      getClient()
      expect(mockSetApiKey).toHaveBeenCalledWith('test-sendgrid-api-key')
    })

    it('applies SENDGRID_API_KEY only once across repeated getClient() calls', async () => {
      vi.resetModules()
      mockSetApiKey.mockClear()

      const { getClient } = await import('../transport.js')
      getClient()
      getClient()
      getClient()

      expect(mockSetApiKey).toHaveBeenCalledTimes(1)
    })

    it('honors SENDGRID_API_KEY resolved AFTER import (late secrets), not the import-time value', async () => {
      // Simulate late secrets resolution: the key is ABSENT when the bond is
      // imported and only lands in process.env afterwards (a secrets bond
      // resolving at startup). The lazy client must apply the value present at
      // first send — never the empty import-time value.
      delete process.env.SENDGRID_API_KEY
      vi.resetModules()
      mockSetApiKey.mockClear()

      const { sendMail } = await import('../sendMail.js')

      // Import saw no key, so nothing was configured at import time.
      expect(mockSetApiKey).not.toHaveBeenCalled()

      // The real key arrives late, before the first send.
      process.env.SENDGRID_API_KEY = 'late-resolved-key'
      mockSend.mockResolvedValue([{ statusCode: 202, headers: {}, body: '' }, {}])

      await sendMail({ from: 'a@x.com', to: 'b@y.com', subject: 'Hi', text: 'x' })

      // The SDK was configured with the LATE value at send time.
      expect(mockSetApiKey).toHaveBeenCalledWith('late-resolved-key')
      expect(mockSetApiKey).not.toHaveBeenCalledWith('')
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('honors SENDGRID_BASE_URL resolved AFTER import (late secrets)', async () => {
      delete process.env.SENDGRID_BASE_URL
      vi.resetModules()
      mockSetDefaultRequest.mockClear()

      const { sendMail } = await import('../sendMail.js')
      expect(mockSetDefaultRequest).not.toHaveBeenCalled()

      process.env.SENDGRID_BASE_URL = 'https://late-broker.example.com'
      mockSend.mockResolvedValue([{ statusCode: 202, headers: {}, body: '' }, {}])

      await sendMail({ from: 'a@x.com', to: 'b@y.com', subject: 'Hi', text: 'x' })

      expect(mockSetDefaultRequest).toHaveBeenCalledWith(
        'baseUrl',
        'https://late-broker.example.com',
      )
    })

    it('does not call setApiKey when SENDGRID_API_KEY is missing (even on getClient)', async () => {
      delete process.env.SENDGRID_API_KEY
      vi.resetModules()
      mockSetApiKey.mockClear()

      const { getClient } = await import('../transport.js')
      getClient()

      expect(mockSetApiKey).not.toHaveBeenCalled()
    })

    it('tags the missing-key error as a config-missing 503 (statusCode + errorKey)', async () => {
      // The API middleware (classifyTaggedError) maps this to a clean 503 +
      // 'config.notConfigured' instead of an opaque SendGrid 401.
      delete process.env.SENDGRID_API_KEY
      vi.resetModules()
      const { sendMail } = await import('../sendMail.js')
      let caught: unknown
      await sendMail({ from: 'a@x', to: 'test@test.com', subject: 'Test' }).catch((e: unknown) => {
        caught = e
      })
      expect((caught as { message?: string }).message).toContain('SENDGRID_API_KEY is not set')
      expect((caught as { statusCode?: number }).statusCode).toBe(503)
      expect((caught as { errorKey?: string }).errorKey).toBe('config.notConfigured')
      expect(mockSend).not.toHaveBeenCalled()
    })

    it('sets the base URL on first getClient() when SENDGRID_BASE_URL is set', async () => {
      process.env.SENDGRID_BASE_URL = 'https://broker.example.com'
      vi.resetModules()
      mockSetDefaultRequest.mockClear()

      const { getClient } = await import('../transport.js')
      // Lazy: not configured merely by importing.
      expect(mockSetDefaultRequest).not.toHaveBeenCalled()
      getClient()

      expect(mockSetDefaultRequest).toHaveBeenCalledWith('baseUrl', 'https://broker.example.com')
    })

    it('should not set the base URL when SENDGRID_BASE_URL is missing', async () => {
      delete process.env.SENDGRID_BASE_URL
      vi.resetModules()
      mockSetDefaultRequest.mockClear()

      const { getClient } = await import('../transport.js')
      getClient()

      expect(mockSetDefaultRequest).not.toHaveBeenCalled()
    })
  })

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.sendMail).toBeDefined()
      expect(exports.provider).toBeDefined()
      expect(exports.getClient).toBeDefined()
    })

    it('registers SENDGRID_API_KEY in the @molecule/api-secrets registry when the barrel is imported', async () => {
      await import('../index.js')
      const { getSecretDefinition } = await import('@molecule/api-secrets')
      expect(getSecretDefinition('SENDGRID_API_KEY')).toBeDefined()
    })
  })
})
