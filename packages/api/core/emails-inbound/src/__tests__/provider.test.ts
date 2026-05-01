import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  InboundEmail,
  InboundEmailProvider,
  InboundEmailReply,
  InboundEmailReplyResult,
} from '../types.js'

// We need to reset the module state between tests so the bond registry
// is not contaminated across cases.
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let parseWebhookPayload: typeof ProviderModule.parseWebhookPayload
let verifySignature: typeof ProviderModule.verifySignature
let supportsReply: typeof ProviderModule.supportsReply
let replyTo: typeof ProviderModule.replyTo

const buildProvider = (overrides: Partial<InboundEmailProvider> = {}): InboundEmailProvider => ({
  parseWebhookPayload: vi.fn(),
  verifySignature: vi.fn(),
  supportsReply: vi.fn().mockReturnValue(false),
  ...overrides,
})

const buildEmail = (overrides: Partial<InboundEmail> = {}): InboundEmail => ({
  id: 'msg-1',
  from: 'alice@example.com',
  to: ['support@acme.test'],
  subject: 'Help',
  textBody: 'Hi',
  headers: { 'message-id': '<msg-1@example.com>' },
  receivedAt: new Date('2026-05-01T12:00:00Z'),
  ...overrides,
})

describe('emails-inbound provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    parseWebhookPayload = providerModule.parseWebhookPayload
    verifySignature = providerModule.verifySignature
    supportsReply = providerModule.supportsReply
    replyTo = providerModule.replyTo
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Inbound-emails provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = buildProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = buildProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('parseWebhookPayload', () => {
    it('should throw when no provider is set', async () => {
      await expect(parseWebhookPayload({}, '')).rejects.toThrow(
        'Inbound-emails provider not configured',
      )
    })

    it('should call provider parseWebhookPayload with headers and body', async () => {
      const email = buildEmail()
      const mockParse = vi.fn().mockResolvedValue(email)
      setProvider(buildProvider({ parseWebhookPayload: mockParse }))

      const headers = { 'content-type': 'application/json' }
      const body = Buffer.from('{}')
      const result = await parseWebhookPayload(headers, body)

      expect(mockParse).toHaveBeenCalledWith(headers, body)
      expect(result).toBe(email)
    })

    it('should accept a string body and pass it through unchanged', async () => {
      const email = buildEmail()
      const mockParse = vi.fn().mockResolvedValue(email)
      setProvider(buildProvider({ parseWebhookPayload: mockParse }))

      await parseWebhookPayload({}, '{"hello":"world"}')

      expect(mockParse).toHaveBeenCalledWith({}, '{"hello":"world"}')
    })

    it('should accept a parsed-object body', async () => {
      const email = buildEmail()
      const mockParse = vi.fn().mockResolvedValue(email)
      setProvider(buildProvider({ parseWebhookPayload: mockParse }))

      const body = { foo: 'bar' }
      await parseWebhookPayload({}, body)

      expect(mockParse).toHaveBeenCalledWith({}, body)
    })
  })

  describe('verifySignature', () => {
    it('should throw when no provider is set', async () => {
      await expect(verifySignature({}, '')).rejects.toThrow(
        'Inbound-emails provider not configured',
      )
    })

    it('should return true when provider validates the signature', async () => {
      const mockVerify = vi.fn().mockResolvedValue(true)
      setProvider(buildProvider({ verifySignature: mockVerify }))

      const headers = { 'x-mailgun-signature': 'abc' }
      const body = Buffer.from('payload')
      const result = await verifySignature(headers, body)

      expect(mockVerify).toHaveBeenCalledWith(headers, body)
      expect(result).toBe(true)
    })

    it('should return false when provider rejects the signature', async () => {
      const mockVerify = vi.fn().mockResolvedValue(false)
      setProvider(buildProvider({ verifySignature: mockVerify }))

      const result = await verifySignature({}, '')

      expect(result).toBe(false)
    })
  })

  describe('supportsReply', () => {
    it('should throw when no provider is set', () => {
      expect(() => supportsReply()).toThrow('Inbound-emails provider not configured')
    })

    it('should return false when provider has no replyTo method', () => {
      setProvider(buildProvider({ supportsReply: () => true }))
      // No replyTo method on the provider object.
      expect(supportsReply()).toBe(false)
    })

    it('should return false when provider supportsReply returns false', () => {
      const mockReply = vi.fn()
      setProvider(buildProvider({ replyTo: mockReply, supportsReply: () => false }))
      expect(supportsReply()).toBe(false)
    })

    it('should return true when provider exposes replyTo and supportsReply is true', () => {
      const mockReply = vi.fn()
      setProvider(buildProvider({ replyTo: mockReply, supportsReply: () => true }))
      expect(supportsReply()).toBe(true)
    })
  })

  describe('replyTo', () => {
    it('should throw when no provider is set', async () => {
      await expect(replyTo(buildEmail(), {})).rejects.toThrow(
        'Inbound-emails provider not configured',
      )
    })

    it('should throw when bonded provider does not support reply', async () => {
      setProvider(buildProvider({ supportsReply: () => false }))

      await expect(replyTo(buildEmail(), { textBody: 'thanks' })).rejects.toThrow(
        'Bonded inbound-emails provider does not support reply dispatch.',
      )
    })

    it('should dispatch through provider replyTo when supported', async () => {
      const result: InboundEmailReplyResult = { id: 'out-42' }
      const mockReply = vi.fn().mockResolvedValue(result)
      setProvider(buildProvider({ replyTo: mockReply, supportsReply: () => true }))

      const email = buildEmail()
      const reply: InboundEmailReply = {
        subject: 'Re: Help',
        textBody: 'On it!',
      }
      const got = await replyTo(email, reply)

      expect(mockReply).toHaveBeenCalledWith(email, reply)
      expect(got).toBe(result)
    })
  })
})

describe('emails-inbound types', () => {
  it('should accept a minimal InboundEmailProvider implementation', () => {
    const provider: InboundEmailProvider = {
      parseWebhookPayload: async () =>
        ({
          id: 'x',
          from: 'a@b.test',
          to: ['c@d.test'],
          subject: '',
          headers: {},
          receivedAt: new Date(0),
        }) satisfies InboundEmail,
      verifySignature: async () => false,
      supportsReply: () => false,
    }
    expect(typeof provider.parseWebhookPayload).toBe('function')
    expect(typeof provider.verifySignature).toBe('function')
    expect(typeof provider.supportsReply).toBe('function')
    expect(provider.replyTo).toBeUndefined()
  })

  it('should accept an InboundEmail with all optional fields', () => {
    const email: InboundEmail = {
      id: 'msg-1',
      from: 'alice@example.com',
      to: ['support@acme.test'],
      cc: ['cc@acme.test'],
      subject: 'Help',
      textBody: 'plain',
      htmlBody: '<p>html</p>',
      attachments: [
        { name: 'a.pdf', contentType: 'application/pdf', contentBase64: 'AAAA', sizeBytes: 3 },
      ],
      headers: { 'message-id': '<msg-1@example.com>' },
      receivedAt: new Date('2026-05-01T12:00:00Z'),
      messageId: '<msg-1@example.com>',
      inReplyTo: '<prev@example.com>',
      references: ['<prev@example.com>'],
    }
    expect(email.attachments?.[0].name).toBe('a.pdf')
    expect(email.cc).toEqual(['cc@acme.test'])
  })
})
