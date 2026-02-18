/**
 * Comprehensive tests for `@molecule/api-emails`.
 *
 * These tests complement the existing provider.test.ts by focusing on:
 * - Additional edge cases and error scenarios
 * - Advanced integration patterns
 * - Module exports verification
 *
 * Note: Basic provider management and type tests are in provider.test.ts
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  EmailAddress,
  EmailAttachment,
  EmailMessage,
  EmailSendResult,
  EmailTransport,
} from '../index.js'
import type * as IndexModule from '../index.js'

// We need to reset the module state between tests for isolation
let setTransport: typeof IndexModule.setTransport
let getTransport: typeof IndexModule.getTransport
let sendMail: typeof IndexModule.sendMail

describe('@molecule/api-emails', () => {
  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules()
    const indexModule = await import('../index.js')
    setTransport = indexModule.setTransport
    getTransport = indexModule.getTransport
    sendMail = indexModule.sendMail
  })

  describe('Module exports', () => {
    it('should export setTransport function', async () => {
      const module = await import('../index.js')
      expect(typeof module.setTransport).toBe('function')
    })

    it('should export getTransport function', async () => {
      const module = await import('../index.js')
      expect(typeof module.getTransport).toBe('function')
    })

    it('should export sendMail function', async () => {
      const module = await import('../index.js')
      expect(typeof module.sendMail).toBe('function')
    })
  })

  describe('Provider isolation', () => {
    it('should throw error when transport is not configured', () => {
      expect(() => getTransport()).toThrow(
        'Email transport not configured. Call setTransport() first.',
      )
    })

    it('should set and retrieve the same transport instance', () => {
      const mockTransport: EmailTransport = {
        sendMail: vi.fn().mockResolvedValue({
          accepted: [],
          rejected: [],
        }),
      }
      setTransport(mockTransport)
      expect(getTransport()).toBe(mockTransport)
    })

    it('should allow replacing the transport', () => {
      const firstTransport: EmailTransport = {
        sendMail: vi.fn(),
      }
      const secondTransport: EmailTransport = {
        sendMail: vi.fn(),
      }

      setTransport(firstTransport)
      expect(getTransport()).toBe(firstTransport)

      setTransport(secondTransport)
      expect(getTransport()).toBe(secondTransport)
    })
  })

  describe('sendMail edge cases', () => {
    beforeEach(() => {
      const mockTransport: EmailTransport = {
        sendMail: vi.fn().mockResolvedValue({
          accepted: ['test@example.com'],
          rejected: [],
        }),
      }
      setTransport(mockTransport)
    })

    it('should throw when sendMail is called without transport', async () => {
      vi.resetModules()
      const freshModule = await import('../index.js')

      const message: EmailMessage = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
      }

      await expect(freshModule.sendMail(message)).rejects.toThrow('Email transport not configured')
    })

    it('should handle very long subject lines', async () => {
      const mockSendMail = vi.fn().mockResolvedValue({
        accepted: ['recipient@example.com'],
        rejected: [],
      })
      setTransport({ sendMail: mockSendMail })

      const longSubject = 'A'.repeat(1000)
      const message: EmailMessage = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: longSubject,
      }

      await sendMail(message)

      expect(mockSendMail.mock.calls[0][0].subject).toBe(longSubject)
    })

    it('should handle unicode in email content', async () => {
      const mockSendMail = vi.fn().mockResolvedValue({
        accepted: ['recipient@example.com'],
        rejected: [],
      })
      setTransport({ sendMail: mockSendMail })

      const unicodeText = 'Hello World'
      const message: EmailMessage = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Unicode Test',
        text: unicodeText,
        html: `<p>${unicodeText}</p>`,
      }

      await sendMail(message)

      const sentMessage = mockSendMail.mock.calls[0][0]
      expect(sentMessage.text).toBe(unicodeText)
    })

    it('should handle empty string body', async () => {
      const mockSendMail = vi.fn().mockResolvedValue({
        accepted: ['recipient@example.com'],
        rejected: [],
      })
      setTransport({ sendMail: mockSendMail })

      const message: EmailMessage = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Empty Body Test',
        text: '',
        html: '',
      }

      await sendMail(message)

      expect(mockSendMail).toHaveBeenCalledWith(message)
    })

    it('should handle binary attachment content', async () => {
      const mockSendMail = vi.fn().mockResolvedValue({
        accepted: ['recipient@example.com'],
        rejected: [],
      })
      setTransport({ sendMail: mockSendMail })

      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xff])
      const message: EmailMessage = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Binary Attachment',
        attachments: [
          {
            filename: 'binary.bin',
            content: binaryContent,
            contentType: 'application/octet-stream',
          },
        ],
      }

      await sendMail(message)

      expect(mockSendMail.mock.calls[0][0].attachments[0].content).toBe(binaryContent)
    })

    it('should handle inline attachment with cid', async () => {
      const mockSendMail = vi.fn().mockResolvedValue({
        accepted: ['recipient@example.com'],
        rejected: [],
      })
      setTransport({ sendMail: mockSendMail })

      const message: EmailMessage = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Inline Image',
        html: '<img src="cid:logo123" alt="Logo">',
        attachments: [
          {
            filename: 'logo.png',
            content: Buffer.from('PNG data'),
            contentType: 'image/png',
            cid: 'logo123',
          },
        ],
      }

      await sendMail(message)

      expect(mockSendMail.mock.calls[0][0].attachments[0].cid).toBe('logo123')
    })

    it('should propagate errors from the transport', async () => {
      const mockError = new Error('SMTP connection failed')
      const mockSendMail = vi.fn().mockRejectedValue(mockError)
      setTransport({ sendMail: mockSendMail })

      const message: EmailMessage = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
      }

      await expect(sendMail(message)).rejects.toThrow('SMTP connection failed')
    })

    it('should handle partial rejection', async () => {
      const mockSendMail = vi.fn().mockResolvedValue({
        accepted: ['valid@example.com'],
        rejected: ['invalid@example.com'],
        messageId: 'partial-123',
      })
      setTransport({ sendMail: mockSendMail })

      const message: EmailMessage = {
        from: 'sender@example.com',
        to: ['valid@example.com', 'invalid@example.com'],
        subject: 'Test',
      }

      const result = await sendMail(message)

      expect(result.accepted).toContain('valid@example.com')
      expect(result.rejected).toContain('invalid@example.com')
    })
  })

  describe('Integration scenarios', () => {
    it('should support typical transactional email flow', async () => {
      const sentEmails: EmailMessage[] = []
      const mockTransport: EmailTransport = {
        sendMail: async (message) => {
          sentEmails.push(message)
          return {
            accepted: [message.to as string],
            rejected: [],
            messageId: `msg-${Date.now()}`,
          }
        },
      }

      setTransport(mockTransport)

      const welcomeEmail: EmailMessage = {
        from: 'noreply@example.com',
        to: 'newuser@example.com',
        subject: 'Welcome to Our Service',
        text: 'Thanks for signing up!',
        html: '<h1>Welcome!</h1><p>Thanks for signing up!</p>',
      }

      const result = await sendMail(welcomeEmail)

      expect(result.accepted).toContain('newuser@example.com')
      expect(sentEmails).toHaveLength(1)
      expect(sentEmails[0].subject).toBe('Welcome to Our Service')
    })

    it('should support password reset email flow', async () => {
      const mockSendMail = vi.fn().mockResolvedValue({
        accepted: ['user@example.com'],
        rejected: [],
        messageId: 'reset-123',
      })
      setTransport({ sendMail: mockSendMail })

      const resetEmail: EmailMessage = {
        from: { name: 'Security', address: 'security@example.com' },
        to: 'user@example.com',
        replyTo: 'support@example.com',
        subject: 'Password Reset Request',
        text: 'Click here to reset: https://example.com/reset/token123',
        html: '<a href="https://example.com/reset/token123">Reset Password</a>',
      }

      const result = await sendMail(resetEmail)

      expect(result.messageId).toBe('reset-123')
      expect(mockSendMail).toHaveBeenCalledTimes(1)
    })

    it('should support invoice email with attachment', async () => {
      const mockSendMail = vi.fn().mockResolvedValue({
        accepted: ['billing@customer.com'],
        rejected: [],
        messageId: 'invoice-456',
      })
      setTransport({ sendMail: mockSendMail })

      const invoiceEmail: EmailMessage = {
        from: { name: 'Billing Dept', address: 'billing@company.com' },
        to: 'billing@customer.com',
        cc: 'accounting@customer.com',
        subject: 'Invoice #12345',
        text: 'Please find attached invoice #12345',
        html: '<p>Please find attached invoice <strong>#12345</strong></p>',
        attachments: [
          {
            filename: 'invoice-12345.pdf',
            content: Buffer.from('PDF invoice content'),
            contentType: 'application/pdf',
          },
        ],
      }

      const result = await sendMail(invoiceEmail)

      expect(result.accepted).toContain('billing@customer.com')
      const sentMessage = mockSendMail.mock.calls[0][0]
      expect(sentMessage.attachments?.[0].filename).toBe('invoice-12345.pdf')
    })

    it('should support newsletter with multiple recipients', async () => {
      const mockSendMail = vi.fn().mockResolvedValue({
        accepted: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        rejected: [],
        messageId: 'newsletter-789',
      })
      setTransport({ sendMail: mockSendMail })

      const newsletter: EmailMessage = {
        from: { name: 'Newsletter', address: 'news@company.com' },
        to: [
          'user1@example.com',
          { name: 'User 2', address: 'user2@example.com' },
          'user3@example.com',
        ],
        subject: 'Weekly Update',
        text: 'This week in our company...',
        html: '<h1>Weekly Update</h1><p>This week in our company...</p>',
      }

      const result = await sendMail(newsletter)

      expect(result.accepted).toHaveLength(3)
      expect(mockSendMail).toHaveBeenCalledWith(newsletter)
    })
  })

  describe('Type verification', () => {
    it('should accept EmailAttachment with ReadableStream content', () => {
      // Type-only test - verifies the type accepts ReadableStream
      const attachment: EmailAttachment = {
        filename: 'stream.txt',
        // Creating a mock ReadableStream-like object for type verification
        content: {
          read: () => null,
          pipe: () => {},
          on: () => {},
          once: () => {},
          emit: () => false,
          prependListener: () => {},
          prependOnceListener: () => {},
          removeListener: () => {},
          removeAllListeners: () => {},
          setMaxListeners: () => {},
          getMaxListeners: () => 10,
          listeners: () => [],
          rawListeners: () => [],
          listenerCount: () => 0,
          eventNames: () => [],
          addListener: () => {},
          off: () => {},
        } as unknown as NodeJS.ReadableStream,
      }
      expect(attachment.filename).toBe('stream.txt')
    })

    it('should accept EmailMessage with mixed recipient formats', () => {
      const message: EmailMessage = {
        from: 'sender@example.com',
        to: ['plain@example.com', { name: 'Named', address: 'named@example.com' }],
        cc: { name: 'CC Person', address: 'cc@example.com' },
        bcc: ['bcc1@example.com', { address: 'bcc2@example.com' }],
        replyTo: { name: 'Reply', address: 'reply@example.com' },
        subject: 'Test',
      }

      expect(Array.isArray(message.to)).toBe(true)
      expect((message.cc as EmailAddress).name).toBe('CC Person')
    })

    it('should accept EmailSendResult with only required fields', () => {
      const result: EmailSendResult = {
        accepted: [],
        rejected: [],
      }

      expect(result.messageId).toBeUndefined()
      expect(result.response).toBeUndefined()
    })
  })
})
