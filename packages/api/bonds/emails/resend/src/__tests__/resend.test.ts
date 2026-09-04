/**
 * Tests for Resend email provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the global fetch the transport uses (no SDK — the bond is dependency-free).
const mockFetch = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>()

vi.mock('@molecule/api-emails', () => ({}))

/**
 * Builds a JSON `Response` the way Resend answers.
 * @param status - HTTP status.
 * @param body - JSON body.
 * @returns The response.
 */
const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

/**
 * Reads the single request the transport made.
 * @returns The URL, headers and parsed JSON body of the first fetch call.
 */
const lastRequest = (): { url: string; headers: Headers; body: Record<string, unknown> } => {
  const call = mockFetch.mock.calls[0]
  if (!call) throw new Error('fetch was not called')
  const [input, init] = call
  return {
    url: String(input),
    headers: new Headers(init?.headers),
    body: JSON.parse(String(init?.body)) as Record<string, unknown>,
  }
}

describe('Resend Email Provider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
    process.env = { ...originalEnv }
    process.env.RESEND_API_KEY = 'test-resend-api-key'
    delete process.env.RESEND_FROM
    delete process.env.RESEND_BASE_URL
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = originalEnv
    vi.resetModules()
  })

  describe('sendMail', () => {
    it('should send an email successfully', async () => {
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'test-message-id' }))

      const { sendMail } = await import('../sendMail.js')

      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>',
      }

      const result = await sendMail(message)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        accepted: ['recipient@example.com'],
        rejected: [],
        messageId: 'test-message-id',
        response: '200',
      })
    })

    it('POSTs the Resend request shape to /emails with Bearer auth', async () => {
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'msg-1' }))

      const { sendMail } = await import('../sendMail.js')

      await sendMail({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>',
      })

      const [, init] = mockFetch.mock.calls[0] ?? []
      const { url, headers, body } = lastRequest()
      expect(url).toBe('https://api.resend.com/emails')
      expect(init?.method).toBe('POST')
      expect(headers.get('authorization')).toBe('Bearer test-resend-api-key')
      expect(headers.get('content-type')).toBe('application/json')
      expect(body).toEqual({
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>',
      })
    })

    it('should handle a 2xx response without an id', async () => {
      mockFetch.mockResolvedValue(new Response('', { status: 200 }))

      const { sendMail } = await import('../sendMail.js')

      const result = await sendMail({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      })

      expect(result.accepted).toEqual(['recipient@example.com'])
      expect(result.rejected).toEqual([])
      expect(result.messageId).toBeUndefined()
      expect(result.response).toBe('200')
    })

    it('maps a Resend JSON error body to a ResendApiError (status + code + message)', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(403, {
          statusCode: 403,
          name: 'validation_error',
          message: 'The example.com domain is not verified. Please, add and verify your domain.',
        }),
      )

      const { sendMail } = await import('../sendMail.js')
      const { ResendApiError } = await import('../transport.js')

      let caught: unknown
      await sendMail({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      }).catch((e: unknown) => {
        caught = e
      })

      expect(caught).toBeInstanceOf(ResendApiError)
      if (!(caught instanceof ResendApiError)) throw new Error('unreachable')
      expect(caught.status).toBe(403)
      expect(caught.code).toBe('validation_error')
      expect(caught.body).toEqual({
        statusCode: 403,
        name: 'validation_error',
        message: 'The example.com domain is not verified. Please, add and verify your domain.',
      })
      expect(caught.message).toBe(
        'Resend API error 403 (validation_error): The example.com domain is not verified. Please, add and verify your domain.',
      )
      // Not a tagged molecule error: the API middleware must NOT echo Resend's status.
      expect((caught as { statusCode?: unknown }).statusCode).toBeUndefined()
      expect((caught as { errorKey?: unknown }).errorKey).toBeUndefined()
    })

    it('maps a non-JSON error response (e.g. a gateway 502 page) to a ResendApiError', async () => {
      mockFetch.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }))

      const { sendMail } = await import('../sendMail.js')
      const { ResendApiError } = await import('../transport.js')

      let caught: unknown
      await sendMail({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      }).catch((e: unknown) => {
        caught = e
      })

      expect(caught).toBeInstanceOf(ResendApiError)
      if (!(caught instanceof ResendApiError)) throw new Error('unreachable')
      expect(caught.status).toBe(502)
      expect(caught.code).toBeUndefined()
      expect(caught.body).toBeUndefined()
      expect(caught.message).toBe('Resend API error 502: <html>Bad Gateway</html>')
    })

    it('should rethrow a network failure', async () => {
      mockFetch.mockRejectedValue(new Error('fetch failed'))

      const { sendMail } = await import('../sendMail.js')

      await expect(
        sendMail({
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test Subject',
          text: 'Test body',
        }),
      ).rejects.toThrow('fetch failed')
    })

    it('should handle multiple recipients', async () => {
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'test-message-id' }))

      const { sendMail } = await import('../sendMail.js')

      const result = await sendMail({
        from: 'sender@example.com',
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: 'Test Subject',
        text: 'Test body',
      })

      expect(result.accepted).toEqual(['recipient1@example.com', 'recipient2@example.com'])
      expect(result.rejected).toEqual([])
      expect(lastRequest().body.to).toEqual(['recipient1@example.com', 'recipient2@example.com'])
    })

    it('should handle EmailAddress objects as `Name <address>`', async () => {
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'msg-1' }))

      const { sendMail } = await import('../sendMail.js')

      const result = await sendMail({
        from: { name: 'Sender', address: 'sender@example.com' },
        to: { name: 'Recipient', address: 'recipient@example.com' },
        subject: 'Test Subject',
        text: 'Test body',
      })

      expect(result.accepted).toEqual(['recipient@example.com'])
      const { body } = lastRequest()
      expect(body.from).toBe('Sender <sender@example.com>')
      expect(body.to).toEqual(['Recipient <recipient@example.com>'])
    })

    it('quotes display names that carry address syntax and strips CR/LF from them', async () => {
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'msg-1' }))

      const { sendMail } = await import('../sendMail.js')

      await sendMail({
        from: { name: 'Doe, "Jane"', address: 'sender@example.com' },
        to: { name: 'Bob\r\nBcc: victim@example.com', address: 'recipient@example.com' },
        subject: 'Test Subject',
        text: 'Test body',
      })

      const { body } = lastRequest()
      expect(body.from).toBe('"Doe, \\"Jane\\"" <sender@example.com>')
      expect(body.to).toEqual(['"Bob Bcc: victim@example.com" <recipient@example.com>'])
    })

    it('maps cc, bcc and replyTo to cc, bcc and reply_to', async () => {
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'msg-1' }))

      const { sendMail } = await import('../sendMail.js')

      await sendMail({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        cc: ['cc1@example.com', { name: 'CC Two', address: 'cc2@example.com' }],
        bcc: 'bcc@example.com',
        replyTo: { name: 'Support', address: 'support@example.com' },
        subject: 'Test Subject',
        text: 'Test body',
      })

      const { body } = lastRequest()
      expect(body.cc).toEqual(['cc1@example.com', 'CC Two <cc2@example.com>'])
      expect(body.bcc).toEqual(['bcc@example.com'])
      expect(body.reply_to).toBe('Support <support@example.com>')
      expect(body).not.toHaveProperty('replyTo')
    })

    it('omits cc/bcc/attachments keys when they are empty or absent', async () => {
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'msg-1' }))

      const { sendMail } = await import('../sendMail.js')

      await sendMail({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        cc: [],
        subject: 'Test Subject',
        text: 'Test body',
        attachments: [],
      })

      const { body } = lastRequest()
      expect(body).not.toHaveProperty('cc')
      expect(body).not.toHaveProperty('bcc')
      expect(body).not.toHaveProperty('reply_to')
      expect(body).not.toHaveProperty('attachments')
      expect(body).not.toHaveProperty('html')
    })
  })

  describe('attachments', () => {
    it('base64-encodes Buffer and string content and maps contentType/cid to content_type/content_id', async () => {
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'msg-1' }))

      const { sendMail } = await import('../sendMail.js')

      await sendMail({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<img src="cid:logo">',
        attachments: [
          {
            filename: 'report.pdf',
            content: Buffer.from('%PDF-1.4'),
            contentType: 'application/pdf',
          },
          { filename: 'notes.txt', content: 'hello world' },
          {
            filename: 'logo.png',
            content: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
            contentType: 'image/png',
            cid: 'logo',
          },
        ],
      })

      const { body } = lastRequest()
      expect(body.attachments).toEqual([
        {
          filename: 'report.pdf',
          content: Buffer.from('%PDF-1.4').toString('base64'),
          content_type: 'application/pdf',
        },
        {
          filename: 'notes.txt',
          content: Buffer.from('hello world', 'utf-8').toString('base64'),
        },
        {
          filename: 'logo.png',
          content: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64'),
          content_type: 'image/png',
          content_id: 'logo',
        },
      ])
    })

    it('honors the attachment encoding for string content (base64 input is passed through)', async () => {
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'msg-1' }))

      const { sendMail } = await import('../sendMail.js')

      const alreadyBase64 = Buffer.from('binary payload').toString('base64')
      await sendMail({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
        attachments: [
          { filename: 'blob.bin', content: alreadyBase64, encoding: 'base64' },
          { filename: 'hex.bin', content: '68656c6c6f', encoding: 'hex' },
          { filename: 'odd.txt', content: 'plain', encoding: 'not-an-encoding' },
        ],
      })

      const { body } = lastRequest()
      expect(body.attachments).toEqual([
        { filename: 'blob.bin', content: alreadyBase64 },
        { filename: 'hex.bin', content: Buffer.from('hello').toString('base64') },
        { filename: 'odd.txt', content: Buffer.from('plain', 'utf-8').toString('base64') },
      ])
    })

    it('throws for stream attachments before any request is made', async () => {
      const { sendMail } = await import('../sendMail.js')
      const { Readable } = await import('node:stream')

      await expect(
        sendMail({
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test Subject',
          text: 'Test body',
          attachments: [{ filename: 'stream.txt', content: Readable.from(['chunk']) }],
        }),
      ).rejects.toThrow('Stream attachments are not supported by the Resend provider')
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('sender resolution (RESEND_FROM)', () => {
    it('uses the message from when present, ignoring RESEND_FROM', async () => {
      process.env.RESEND_FROM = 'Default <default@example.com>'
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'msg-1' }))

      const { sendMail } = await import('../sendMail.js')

      await sendMail({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      })

      expect(lastRequest().body.from).toBe('sender@example.com')
    })

    it('falls back to RESEND_FROM when the message from is empty', async () => {
      process.env.RESEND_FROM = 'Default <default@example.com>'
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'msg-1' }))

      const { sendMail } = await import('../sendMail.js')

      await sendMail({
        from: '',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      })

      expect(lastRequest().body.from).toBe('Default <default@example.com>')
    })

    it('tags a missing sender (no from, no RESEND_FROM) as a config-missing 503', async () => {
      delete process.env.RESEND_FROM
      const { sendMail } = await import('../sendMail.js')

      let caught: unknown
      await sendMail({
        from: { name: 'Nobody', address: '  ' },
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      }).catch((e: unknown) => {
        caught = e
      })

      expect((caught as { message?: string }).message).toContain('RESEND_FROM is not set')
      expect((caught as { statusCode?: number }).statusCode).toBe(503)
      expect((caught as { errorKey?: string }).errorKey).toBe('config.notConfigured')
      expect(mockFetch).not.toHaveBeenCalled()
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
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'test-message-id' }))

      const { provider } = await import('../provider.js')

      const result = await provider.sendMail({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test body',
      })

      expect(result.messageId).toBe('test-message-id')
    })
  })

  describe('transport', () => {
    it('should export getClient', async () => {
      const { getClient } = await import('../transport.js')

      expect(getClient).toBeDefined()
      expect(typeof getClient).toBe('function')
      const client = getClient()
      expect(typeof client.send).toBe('function')
    })

    it('tags a missing key as a config-missing 503 when the client is used directly', async () => {
      delete process.env.RESEND_API_KEY
      const { getClient } = await import('../transport.js')

      let caught: unknown
      await getClient()
        .send({ from: 'a@x.com', to: ['b@y.com'], subject: 'Hi' })
        .catch((e: unknown) => {
          caught = e
        })

      expect((caught as { statusCode?: number }).statusCode).toBe(503)
      expect((caught as { errorKey?: string }).errorKey).toBe('config.notConfigured')
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('lazy configuration (env read at send time, not import)', () => {
    it('does NOT touch fetch or the environment at import time', async () => {
      delete process.env.RESEND_API_KEY
      const { getClient } = await import('../transport.js')

      // Importing / obtaining the client must not read env or make a request.
      getClient()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('honors RESEND_API_KEY resolved AFTER import (late secrets), not the import-time value', async () => {
      // Simulate late secrets resolution: the key is ABSENT when the bond is
      // imported and only lands in process.env afterwards (a secrets bond
      // resolving at startup). The send must use the value present at send
      // time — never the empty import-time value.
      delete process.env.RESEND_API_KEY
      const { sendMail } = await import('../sendMail.js')

      process.env.RESEND_API_KEY = 'late-resolved-key'
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'msg-1' }))

      await sendMail({ from: 'a@x.com', to: 'b@y.com', subject: 'Hi', text: 'x' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(lastRequest().headers.get('authorization')).toBe('Bearer late-resolved-key')
    })

    it('honors RESEND_BASE_URL resolved AFTER import (late secrets)', async () => {
      delete process.env.RESEND_BASE_URL
      const { sendMail } = await import('../sendMail.js')

      process.env.RESEND_BASE_URL = 'https://late-broker.example.com/'
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'msg-1' }))

      await sendMail({ from: 'a@x.com', to: 'b@y.com', subject: 'Hi', text: 'x' })

      expect(lastRequest().url).toBe('https://late-broker.example.com/emails')
    })

    it('tags the missing-key error as a config-missing 503 (statusCode + errorKey)', async () => {
      // The API middleware (classifyTaggedError) maps this to a clean 503 +
      // 'config.notConfigured' instead of an opaque Resend 401.
      delete process.env.RESEND_API_KEY
      const { sendMail } = await import('../sendMail.js')
      let caught: unknown
      await sendMail({ from: 'a@x', to: 'test@test.com', subject: 'Test' }).catch((e: unknown) => {
        caught = e
      })
      expect((caught as { message?: string }).message).toContain('RESEND_API_KEY is not set')
      expect((caught as { statusCode?: number }).statusCode).toBe(503)
      expect((caught as { errorKey?: string }).errorKey).toBe('config.notConfigured')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('uses the default base URL when RESEND_BASE_URL is missing', async () => {
      delete process.env.RESEND_BASE_URL
      mockFetch.mockResolvedValue(jsonResponse(200, { id: 'msg-1' }))

      const { sendMail } = await import('../sendMail.js')
      await sendMail({ from: 'a@x.com', to: 'b@y.com', subject: 'Hi', text: 'x' })

      expect(lastRequest().url).toBe('https://api.resend.com/emails')
    })
  })

  describe('index exports', () => {
    it('should export all expected items', async () => {
      const exports = await import('../index.js')

      expect(exports.sendMail).toBeDefined()
      expect(exports.provider).toBeDefined()
      expect(exports.getClient).toBeDefined()
      expect(exports.ResendApiError).toBeDefined()
      expect(exports.RESEND_DEFAULT_BASE_URL).toBe('https://api.resend.com')
      expect(exports.emailsResendSecretDefinitions.map((d) => d.key)).toEqual([
        'RESEND_API_KEY',
        'RESEND_FROM',
      ])
    })

    it('registers RESEND_API_KEY and RESEND_FROM in the @molecule/api-secrets registry when the barrel is imported', async () => {
      await import('../index.js')
      const { getSecretDefinition } = await import('@molecule/api-secrets')
      expect(getSecretDefinition('RESEND_API_KEY')).toBeDefined()
      expect(getSecretDefinition('RESEND_API_KEY')?.required).toBe(true)
      expect(getSecretDefinition('RESEND_FROM')).toBeDefined()
      expect(getSecretDefinition('RESEND_FROM')?.required).toBe(false)
    })
  })
})
