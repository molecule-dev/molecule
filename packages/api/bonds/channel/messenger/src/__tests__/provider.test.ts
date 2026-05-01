/**
 * Tests for the Facebook Messenger channel provider.
 *
 * @module
 */

import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, MessengerChannelProvider } from '../provider.js'

const SAMPLE_TOKEN = 'EAAFAKE_TOKEN_abc123'
const SAMPLE_APP_SECRET = 'super-secret-app-secret'
const SAMPLE_PSID = '1234567890'

/**
 * Builds a mock `fetch` Response with a JSON body.
 *
 * @param body - JSON body to return.
 * @param init - Optional response init.
 * @param init.status - HTTP status code (default 200).
 * @returns A minimal Response-shaped object suitable for vi.stubGlobal.
 */
function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return {
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    status: init.status ?? 200,
    async json() {
      return body
    },
  } as Response
}

/**
 * Computes the `sha256=…` header value Messenger sends for a body.
 *
 * @param body - Raw body bytes (or string).
 * @param secret - App secret used to sign.
 * @returns The header value.
 */
function sigFor(body: string | Uint8Array, secret: string): string {
  const buf = typeof body === 'string' ? Buffer.from(body, 'utf8') : Buffer.from(body)
  return `sha256=${createHmac('sha256', secret).update(buf).digest('hex')}`
}

describe('@molecule/api-channel-messenger', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN
    delete process.env.CHANNEL_MESSENGER_APP_SECRET
  })

  describe('provider name and features', () => {
    it('exposes the channel name "messenger"', () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })
      expect(p.name).toBe('messenger')
    })

    it('listSupportedFeatures advertises text/buttons/attachments and signed webhooks', () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })
      expect(p.listSupportedFeatures()).toEqual({
        text: true,
        buttons: true,
        attachments: true,
        threads: false,
        signedWebhooks: true,
      })
    })

    it('createProvider returns a MessengerChannelProvider instance', () => {
      expect(createProvider({ pageAccessToken: SAMPLE_TOKEN })).toBeInstanceOf(
        MessengerChannelProvider,
      )
    })
  })

  describe('sendMessage', () => {
    it('throws when no recipient is provided', async () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })
      await expect(p.sendMessage('', { kind: 'text', text: 'hi' })).rejects.toThrow(
        /recipient.*required/i,
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws when no page access token is configured', async () => {
      const p = createProvider()
      await expect(p.sendMessage(SAMPLE_PSID, { kind: 'text', text: 'hi' })).rejects.toThrow(
        /page access token is not configured/i,
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('POSTs JSON to /v22.0/me/messages with the access token in the query string', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ recipient_id: SAMPLE_PSID, message_id: 'mid.123' }),
      )
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })

      const result = await p.sendMessage(SAMPLE_PSID, { kind: 'text', text: 'hello' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]!
      expect(url).toBe(`https://graph.facebook.com/v22.0/me/messages?access_token=${SAMPLE_TOKEN}`)
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(options.body)
      expect(body).toEqual({
        recipient: { id: SAMPLE_PSID },
        messaging_type: 'RESPONSE',
        message: { text: 'hello' },
      })

      expect(result.messageId).toBe('mid.123')
      expect(result.deliveredAt).toBeInstanceOf(Date)
    })

    it('honours the configured defaultMessagingType', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message_id: 'mid.1' }))
      const p = createProvider({
        pageAccessToken: SAMPLE_TOKEN,
        defaultMessagingType: 'UPDATE',
      })

      await p.sendMessage(SAMPLE_PSID, { kind: 'text', text: 'x' })

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body)
      expect(body.messaging_type).toBe('UPDATE')
    })

    it('honours apiVersion override', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message_id: 'mid.1' }))
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN, apiVersion: 'v20.0' })

      await p.sendMessage(SAMPLE_PSID, { kind: 'text', text: 'x' })

      const url = mockFetch.mock.calls[0]![0]
      expect(url).toContain('/v20.0/me/messages')
    })

    it('renders 1–3 buttons as a button_template attachment', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message_id: 'mid.1' }))
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })

      await p.sendMessage(SAMPLE_PSID, {
        kind: 'rich',
        text: 'pick one',
        buttons: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      })

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body)
      expect(body.message).toEqual({
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: 'pick one',
            buttons: [
              { type: 'postback', title: 'Yes', payload: 'yes' },
              { type: 'postback', title: 'No', payload: 'no' },
            ],
          },
        },
      })
    })

    it('falls back to quick_replies when more than 3 buttons are provided', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message_id: 'mid.1' }))
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })

      await p.sendMessage(SAMPLE_PSID, {
        kind: 'rich',
        text: 'pick one',
        buttons: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
          { label: 'C', value: 'c' },
          { label: 'D', value: 'd' },
        ],
      })

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body)
      expect(body.message.text).toBe('pick one')
      expect(body.message.quick_replies).toEqual([
        { content_type: 'text', title: 'A', payload: 'a' },
        { content_type: 'text', title: 'B', payload: 'b' },
        { content_type: 'text', title: 'C', payload: 'c' },
        { content_type: 'text', title: 'D', payload: 'd' },
      ])
      expect(body.message.attachment).toBeUndefined()
    })

    it('renders a media message with image content type as an image attachment', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message_id: 'mid.1' }))
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })

      await p.sendMessage(SAMPLE_PSID, {
        kind: 'media',
        attachments: [{ url: 'https://example.com/x.png', contentType: 'image/png' }],
      })

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body)
      expect(body.message).toEqual({
        attachment: {
          type: 'image',
          payload: { url: 'https://example.com/x.png', is_reusable: false },
        },
      })
    })

    it('infers attachment type from filename when contentType is missing', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message_id: 'mid.1' }))
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })

      await p.sendMessage(SAMPLE_PSID, {
        kind: 'media',
        attachments: [{ url: 'https://example.com/clip.mp4', filename: 'clip.mp4' }],
      })

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body)
      expect(body.message.attachment.type).toBe('video')
    })

    it('defaults unknown attachment types to "file"', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message_id: 'mid.1' }))
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })

      await p.sendMessage(SAMPLE_PSID, {
        kind: 'media',
        attachments: [{ url: 'https://example.com/x.pdf', contentType: 'application/pdf' }],
      })

      const body = JSON.parse(mockFetch.mock.calls[0]![1].body)
      expect(body.message.attachment.type).toBe('file')
    })

    it('reads page access token from CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN env var', async () => {
      process.env.CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN = SAMPLE_TOKEN
      mockFetch.mockResolvedValue(jsonResponse({ message_id: 'mid.env' }))
      const p = createProvider()

      await p.sendMessage(SAMPLE_PSID, { kind: 'text', text: 'env' })

      const url = mockFetch.mock.calls[0]![0]
      expect(url).toBe(`https://graph.facebook.com/v22.0/me/messages?access_token=${SAMPLE_TOKEN}`)
    })

    it('throws on a Send API error envelope without leaking the token', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          { error: { message: 'Invalid OAuth access token (EAAFAKE_TOKEN_abc123).', code: 190 } },
          { status: 400 },
        ),
      )
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })

      try {
        await p.sendMessage(SAMPLE_PSID, { kind: 'text', text: 'x' })
        throw new Error('expected sendMessage to throw')
      } catch (error) {
        const msg = (error as Error).message
        expect(msg).toMatch(/Invalid OAuth access token/)
        expect(msg).toContain('<redacted>')
        expect(msg).not.toContain(SAMPLE_TOKEN)
      }
    })

    it('throws on network error without leaking the token', async () => {
      mockFetch.mockRejectedValue(new Error('ENOTFOUND graph.facebook.com'))
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })

      try {
        await p.sendMessage(SAMPLE_PSID, { kind: 'text', text: 'hi' })
        throw new Error('expected sendMessage to throw')
      } catch (error) {
        const msg = (error as Error).message
        expect(msg).toMatch(/ENOTFOUND/)
        expect(msg).toContain('<redacted>')
        expect(msg).not.toContain(SAMPLE_TOKEN)
      }
    })

    it('passes an AbortSignal so the request can time out', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message_id: 'mid.1' }))
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })

      await p.sendMessage(SAMPLE_PSID, { kind: 'text', text: 'x' })

      const options = mockFetch.mock.calls[0]![1]
      expect(options.signal).toBeInstanceOf(AbortSignal)
    })
  })

  describe('verifyWebhookSignature', () => {
    const body = JSON.stringify({ object: 'page', entry: [] })

    it('returns false when no app secret is configured', () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })
      expect(
        p.verifyWebhookSignature({ 'x-hub-signature-256': sigFor(body, SAMPLE_APP_SECRET) }, body),
      ).toBe(false)
    })

    it('returns false when the signature header is missing', () => {
      const p = createProvider({
        pageAccessToken: SAMPLE_TOKEN,
        appSecret: SAMPLE_APP_SECRET,
      })
      expect(p.verifyWebhookSignature({}, body)).toBe(false)
    })

    it('returns false when the header is malformed (not sha256=…)', () => {
      const p = createProvider({
        pageAccessToken: SAMPLE_TOKEN,
        appSecret: SAMPLE_APP_SECRET,
      })
      expect(p.verifyWebhookSignature({ 'x-hub-signature-256': 'bogus' }, body)).toBe(false)
      expect(p.verifyWebhookSignature({ 'x-hub-signature-256': 'sha1=abcd' }, body)).toBe(false)
    })

    it('returns true on a valid HMAC-SHA256 signature', () => {
      const p = createProvider({
        pageAccessToken: SAMPLE_TOKEN,
        appSecret: SAMPLE_APP_SECRET,
      })
      expect(
        p.verifyWebhookSignature({ 'x-hub-signature-256': sigFor(body, SAMPLE_APP_SECRET) }, body),
      ).toBe(true)
    })

    it('returns false when the signature does not match', () => {
      const p = createProvider({
        pageAccessToken: SAMPLE_TOKEN,
        appSecret: SAMPLE_APP_SECRET,
      })
      expect(
        p.verifyWebhookSignature({ 'x-hub-signature-256': sigFor(body, 'wrong-secret') }, body),
      ).toBe(false)
    })

    it('looks up the header case-insensitively', () => {
      const p = createProvider({
        pageAccessToken: SAMPLE_TOKEN,
        appSecret: SAMPLE_APP_SECRET,
      })
      expect(
        p.verifyWebhookSignature({ 'X-Hub-Signature-256': sigFor(body, SAMPLE_APP_SECRET) }, body),
      ).toBe(true)
    })

    it('verifies a Uint8Array body identically to a string body', () => {
      const p = createProvider({
        pageAccessToken: SAMPLE_TOKEN,
        appSecret: SAMPLE_APP_SECRET,
      })
      const bytes = new TextEncoder().encode(body)
      expect(
        p.verifyWebhookSignature({ 'x-hub-signature-256': sigFor(body, SAMPLE_APP_SECRET) }, bytes),
      ).toBe(true)
    })
  })

  describe('parseInbound', () => {
    it('throws on a non-object payload', () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })
      expect(() => p.parseInbound(null)).toThrow(/not an object/)
      expect(() => p.parseInbound('hi')).toThrow(/not an object/)
      expect(() => p.parseInbound([])).toThrow(/not an object/)
    })

    it('throws when the envelope has no messaging entries', () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })
      expect(() => p.parseInbound({ object: 'page', entry: [] })).toThrow(/no messaging entries/)
      expect(() => p.parseInbound({ object: 'page', entry: [{ id: 'x', time: 1 }] })).toThrow(
        /no messaging entries/,
      )
    })

    it('throws when no recognized variant is present in the messaging entry', () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })
      expect(() =>
        p.parseInbound({
          object: 'page',
          entry: [{ messaging: [{ sender: { id: 'a' }, recipient: { id: 'b' } }] }],
        }),
      ).toThrow(/supported messaging variant/)
    })

    it('parses a plain text message', () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })
      const update = {
        object: 'page',
        entry: [
          {
            id: 'page-1',
            time: 1700000000000,
            messaging: [
              {
                sender: { id: SAMPLE_PSID },
                recipient: { id: 'page-1' },
                timestamp: 1700000000000,
                message: { mid: 'mid.1', text: 'hello' },
              },
            ],
          },
        ],
      }
      const inbound = p.parseInbound(update)
      expect(inbound).toMatchObject({
        from: SAMPLE_PSID,
        channel: 'messenger',
        text: 'hello',
      })
      expect(inbound.payload).toBe(update)
      expect(inbound.receivedAt).toEqual(new Date(1700000000000))
    })

    it('parses a quick_reply payload as text', () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })
      const inbound = p.parseInbound({
        object: 'page',
        entry: [
          {
            messaging: [
              {
                sender: { id: SAMPLE_PSID },
                timestamp: 1700000000000,
                message: {
                  mid: 'mid.qr',
                  text: 'visible label',
                  quick_reply: { payload: 'opaque-value' },
                },
              },
            ],
          },
        ],
      })
      // quick_reply payload takes precedence over the visible text.
      expect(inbound.text).toBe('opaque-value')
    })

    it('parses an inbound message with attachments', () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })
      const inbound = p.parseInbound({
        object: 'page',
        entry: [
          {
            messaging: [
              {
                sender: { id: SAMPLE_PSID },
                timestamp: 1700000000000,
                message: {
                  mid: 'mid.att',
                  attachments: [
                    { type: 'image', payload: { url: 'https://example.com/cat.jpg' } },
                    { type: 'file', payload: { url: 'https://example.com/x.pdf' } },
                  ],
                },
              },
            ],
          },
        ],
      })
      expect(inbound.attachments).toEqual([
        { url: 'https://example.com/cat.jpg', contentType: 'image/*' },
        { url: 'https://example.com/x.pdf', contentType: 'application/octet-stream' },
      ])
    })

    it('parses a postback as text', () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })
      const inbound = p.parseInbound({
        object: 'page',
        entry: [
          {
            messaging: [
              {
                sender: { id: SAMPLE_PSID },
                timestamp: 1700000000000,
                postback: { title: 'Get Started', payload: 'GET_STARTED_PAYLOAD' },
              },
            ],
          },
        ],
      })
      expect(inbound.text).toBe('GET_STARTED_PAYLOAD')
    })

    it('falls back to postback title when payload is absent', () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })
      const inbound = p.parseInbound({
        object: 'page',
        entry: [
          {
            messaging: [
              {
                sender: { id: SAMPLE_PSID },
                timestamp: 1700000000000,
                postback: { title: 'Hello' },
              },
            ],
          },
        ],
      })
      expect(inbound.text).toBe('Hello')
    })

    it('parses delivery and read receipts as bare events with payload preserved', () => {
      const p = createProvider({ pageAccessToken: SAMPLE_TOKEN })

      const delivery = p.parseInbound({
        object: 'page',
        entry: [
          {
            messaging: [
              {
                sender: { id: SAMPLE_PSID },
                timestamp: 1700000000000,
                delivery: { mids: ['mid.1', 'mid.2'], watermark: 1700000000000 },
              },
            ],
          },
        ],
      })
      expect(delivery.text).toBeUndefined()
      expect(delivery.from).toBe(SAMPLE_PSID)
      expect(delivery.payload).toBeDefined()

      const read = p.parseInbound({
        object: 'page',
        entry: [
          {
            messaging: [
              {
                sender: { id: SAMPLE_PSID },
                timestamp: 1700000000000,
                read: { watermark: 1700000000000 },
              },
            ],
          },
        ],
      })
      expect(read.text).toBeUndefined()
      expect(read.from).toBe(SAMPLE_PSID)
      expect(read.payload).toBeDefined()
    })
  })
})
