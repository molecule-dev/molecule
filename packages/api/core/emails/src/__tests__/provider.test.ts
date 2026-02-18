import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as EmailModule from '../email.js'
import type * as ProviderModule from '../provider.js'
import type {
  EmailAddress,
  EmailAttachment,
  EmailMessage,
  EmailSendResult,
  EmailTransport,
} from '../types.js'

// We need to reset the module state between tests
let setTransport: typeof ProviderModule.setTransport
let getTransport: typeof ProviderModule.getTransport
let sendMail: typeof EmailModule.sendMail

describe('email provider', () => {
  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules()
    const providerModule = await import('../provider.js')
    const emailModule = await import('../email.js')
    setTransport = providerModule.setTransport
    getTransport = providerModule.getTransport
    sendMail = emailModule.sendMail
  })

  describe('transport management', () => {
    it('should throw when no transport is set', () => {
      expect(() => getTransport()).toThrow(
        'Email transport not configured. Call setTransport() first.',
      )
    })

    it('should set and get transport', () => {
      const mockTransport: EmailTransport = {
        sendMail: vi.fn(),
      }
      setTransport(mockTransport)
      expect(getTransport()).toBe(mockTransport)
    })
  })

  describe('sendMail', () => {
    it('should throw when no transport is set', async () => {
      const message: EmailMessage = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
      }
      await expect(sendMail(message)).rejects.toThrow('Email transport not configured')
    })

    it('should call transport sendMail with simple email', async () => {
      const mockResult: EmailSendResult = {
        accepted: ['recipient@example.com'],
        rejected: [],
        messageId: 'msg-123',
      }
      const mockSendMail = vi.fn().mockResolvedValue(mockResult)
      const mockTransport: EmailTransport = {
        sendMail: mockSendMail,
      }
      setTransport(mockTransport)

      const message: EmailMessage = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Plain text body',
      }

      const result = await sendMail(message)

      expect(mockSendMail).toHaveBeenCalledWith(message)
      expect(result.accepted).toContain('recipient@example.com')
      expect(result.messageId).toBe('msg-123')
    })

    it('should handle multiple recipients', async () => {
      const mockResult: EmailSendResult = {
        accepted: ['a@example.com', 'b@example.com'],
        rejected: ['c@example.com'],
      }
      const mockSendMail = vi.fn().mockResolvedValue(mockResult)
      const mockTransport: EmailTransport = {
        sendMail: mockSendMail,
      }
      setTransport(mockTransport)

      const message: EmailMessage = {
        from: 'sender@example.com',
        to: ['a@example.com', 'b@example.com', 'c@example.com'],
        subject: 'Bulk Email',
        html: '<h1>Hello</h1>',
      }

      const result = await sendMail(message)

      expect(result.accepted).toHaveLength(2)
      expect(result.rejected).toHaveLength(1)
    })

    it('should send email with full options', async () => {
      const mockResult: EmailSendResult = {
        accepted: ['to@example.com'],
        rejected: [],
      }
      const mockSendMail = vi.fn().mockResolvedValue(mockResult)
      const mockTransport: EmailTransport = {
        sendMail: mockSendMail,
      }
      setTransport(mockTransport)

      const message: EmailMessage = {
        from: { name: 'Sender Name', address: 'sender@example.com' },
        to: ['direct@example.com', { name: 'Named Recipient', address: 'named@example.com' }],
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
        replyTo: { name: 'Reply To', address: 'reply@example.com' },
        subject: 'Full Email Test',
        text: 'Plain text',
        html: '<p>HTML content</p>',
        attachments: [
          {
            filename: 'test.txt',
            content: 'file content',
            contentType: 'text/plain',
          },
        ],
      }

      await sendMail(message)

      expect(mockSendMail).toHaveBeenCalledWith(message)
    })
  })
})

describe('email types', () => {
  it('should export EmailAddress type', () => {
    const address: EmailAddress = {
      name: 'John Doe',
      address: 'john@example.com',
    }
    expect(address.address).toBe('john@example.com')
  })

  it('should export EmailAddress type with optional name', () => {
    const address: EmailAddress = {
      address: 'john@example.com',
    }
    expect(address.name).toBeUndefined()
  })

  it('should export EmailAttachment type', () => {
    const attachment: EmailAttachment = {
      filename: 'document.pdf',
      content: Buffer.from('PDF content'),
      contentType: 'application/pdf',
      encoding: 'base64',
      cid: 'attachment-001',
    }
    expect(attachment.filename).toBe('document.pdf')
  })

  it('should export EmailAttachment with string content', () => {
    const attachment: EmailAttachment = {
      filename: 'text.txt',
      content: 'Plain text content',
    }
    expect(typeof attachment.content).toBe('string')
  })

  it('should export EmailMessage type with string addresses', () => {
    const message: EmailMessage = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
    }
    expect(message.from).toBe('sender@example.com')
  })

  it('should export EmailMessage type with EmailAddress objects', () => {
    const message: EmailMessage = {
      from: { name: 'Sender', address: 'sender@example.com' },
      to: { name: 'Recipient', address: 'recipient@example.com' },
      subject: 'Test',
    }
    expect((message.from as EmailAddress).name).toBe('Sender')
  })

  it('should export EmailMessage type with array of recipients', () => {
    const message: EmailMessage = {
      from: 'sender@example.com',
      to: ['a@example.com', { name: 'B', address: 'b@example.com' }],
      cc: ['cc1@example.com', { name: 'CC2', address: 'cc2@example.com' }],
      bcc: ['bcc@example.com'],
      subject: 'Multi-recipient test',
    }
    expect(Array.isArray(message.to)).toBe(true)
  })

  it('should export EmailSendResult type', () => {
    const result: EmailSendResult = {
      accepted: ['a@example.com', 'b@example.com'],
      rejected: ['c@example.com'],
      messageId: 'msg-abc-123',
      response: '250 OK',
    }
    expect(result.accepted).toHaveLength(2)
    expect(result.rejected).toHaveLength(1)
  })

  it('should export EmailTransport type', () => {
    const transport: EmailTransport = {
      sendMail: async (_message: EmailMessage): Promise<EmailSendResult> => ({
        accepted: [],
        rejected: [],
      }),
    }
    expect(typeof transport.sendMail).toBe('function')
  })
})
