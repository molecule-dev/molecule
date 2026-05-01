/**
 * Tests for the WhatsApp channel provider.
 *
 * @module
 */

import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, WhatsAppChannelProvider } from '../provider.js'

const SAMPLE_TOKEN = 'EAAFakeWhatsAppAccessToken123456'
const SAMPLE_PHONE_ID = '1234567890'
const SAMPLE_APP_SECRET = 'test-meta-app-secret'

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return {
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    status: init.status ?? 200,
    async json() {
      return body
    },
  } as Response
}

function makeProvider(overrides: Partial<Parameters<typeof createProvider>[0]> = {}) {
  return createProvider({
    accessToken: SAMPLE_TOKEN,
    phoneNumberId: SAMPLE_PHONE_ID,
    appSecret: SAMPLE_APP_SECRET,
    ...overrides,
  })
}

describe('@molecule/api-channel-whatsapp', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CHANNEL_WHATSAPP_ACCESS_TOKEN
    delete process.env.CHANNEL_WHATSAPP_PHONE_NUMBER_ID
    delete process.env.CHANNEL_WHATSAPP_APP_SECRET
  })

  describe('provider name and features', () => {
    it('exposes the channel name "whatsapp"', () => {
      const p = makeProvider()
      expect(p.name).toBe('whatsapp')
    })

    it('listSupportedFeatures advertises text/buttons/attachments and signed webhooks', () => {
      const p = makeProvider()
      expect(p.listSupportedFeatures()).toEqual({
        text: true,
        buttons: true,
        attachments: true,
        threads: false,
        signedWebhooks: true,
      })
    })

    it('createProvider returns a WhatsAppChannelProvider instance', () => {
      expect(makeProvider()).toBeInstanceOf(WhatsAppChannelProvider)
    })
  })

  describe('sendMessage', () => {
    it('throws when no access token is configured', async () => {
      const p = createProvider({ phoneNumberId: SAMPLE_PHONE_ID })
      await expect(p.sendMessage('15551234567', { kind: 'text', text: 'hi' })).rejects.toThrow(
        /access token is not configured/i,
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('throws when no phone-number id is configured', async () => {
      const p = createProvider({ accessToken: SAMPLE_TOKEN })
      await expect(p.sendMessage('15551234567', { kind: 'text', text: 'hi' })).rejects.toThrow(
        /phone-number id is not configured/i,
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('POSTs JSON to the Cloud API with a Bearer Authorization header', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.123' }] }),
      )
      const p = makeProvider()

      const result = await p.sendMessage('15551234567', { kind: 'text', text: 'hello' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe(`https://graph.facebook.com/v22.0/${SAMPLE_PHONE_ID}/messages`)
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')
      expect(options.headers.Authorization).toBe(`Bearer ${SAMPLE_TOKEN}`)
      const body = JSON.parse(options.body)
      expect(body).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '15551234567',
        type: 'text',
        text: { body: 'hello' },
      })
      expect(result.messageId).toBe('wamid.123')
      expect(result.deliveredAt).toBeInstanceOf(Date)
    })

    it('honours configured apiVersion', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ messages: [{ id: 'wamid.1' }] }))
      const p = makeProvider({ apiVersion: 'v23.0' })

      await p.sendMessage('15551234567', { kind: 'text', text: 'hi' })

      expect(mockFetch.mock.calls[0][0]).toBe(
        `https://graph.facebook.com/v23.0/${SAMPLE_PHONE_ID}/messages`,
      )
    })

    it('builds an interactive button body for rich messages with buttons', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ messages: [{ id: 'wamid.1' }] }))
      const p = makeProvider()

      await p.sendMessage('15551234567', {
        kind: 'rich',
        text: 'Pick one',
        buttons: [
          { label: 'Yes', value: 'yes_id' },
          { label: 'No', value: 'no_id' },
        ],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.type).toBe('interactive')
      expect(body.interactive).toEqual({
        type: 'button',
        body: { text: 'Pick one' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'yes_id', title: 'Yes' } },
            { type: 'reply', reply: { id: 'no_id', title: 'No' } },
          ],
        },
      })
    })

    it('caps interactive buttons at three (Cloud API limit)', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ messages: [{ id: 'wamid.1' }] }))
      const p = makeProvider()

      await p.sendMessage('15551234567', {
        kind: 'rich',
        text: 'too many',
        buttons: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
          { label: 'C', value: 'c' },
          { label: 'D', value: 'd' },
        ],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.interactive.action.buttons).toHaveLength(3)
    })

    it('builds a template body when payload.template is supplied', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ messages: [{ id: 'wamid.1' }] }))
      const p = makeProvider()

      await p.sendMessage('15551234567', {
        kind: 'rich',
        text: 'unused outside template',
        payload: {
          template: {
            name: 'order_confirmation',
            language: 'en_US',
            bodyParameters: ['Ada', '#A123'],
          },
        },
      } as Parameters<typeof p.sendMessage>[1])

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.type).toBe('template')
      expect(body.template).toEqual({
        name: 'order_confirmation',
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Ada' },
              { type: 'text', text: '#A123' },
            ],
          },
        ],
      })
    })

    it('builds an image media body for image attachments with a URL', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ messages: [{ id: 'wamid.1' }] }))
      const p = makeProvider()

      await p.sendMessage('15551234567', {
        kind: 'media',
        text: 'caption!',
        attachments: [{ url: 'https://example.com/x.png', contentType: 'image/png' }],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.type).toBe('image')
      expect(body.image).toEqual({ link: 'https://example.com/x.png', caption: 'caption!' })
    })

    it('builds a document media body for non-image attachments and forwards filename', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ messages: [{ id: 'wamid.1' }] }))
      const p = makeProvider()

      await p.sendMessage('15551234567', {
        kind: 'media',
        attachments: [
          {
            url: 'https://example.com/x.pdf',
            contentType: 'application/pdf',
            filename: 'invoice.pdf',
          },
        ],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.type).toBe('document')
      expect(body.document).toEqual({ link: 'https://example.com/x.pdf', filename: 'invoice.pdf' })
    })

    it('classifies image/webp attachments as stickers', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ messages: [{ id: 'wamid.1' }] }))
      const p = makeProvider()

      await p.sendMessage('15551234567', {
        kind: 'media',
        attachments: [{ url: 'https://example.com/x.webp', contentType: 'image/webp' }],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.type).toBe('sticker')
      expect(body.sticker).toEqual({ link: 'https://example.com/x.webp' })
    })

    it('falls back to a text body when a media attachment has no URL', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ messages: [{ id: 'wamid.1' }] }))
      const p = makeProvider()

      await p.sendMessage('15551234567', {
        kind: 'media',
        text: 'no url',
        attachments: [{ contentType: 'image/png' }],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.type).toBe('text')
      expect(body.text).toEqual({ body: 'no url' })
    })

    it('reads access token / phone-number id / app secret from env vars', async () => {
      process.env.CHANNEL_WHATSAPP_ACCESS_TOKEN = SAMPLE_TOKEN
      process.env.CHANNEL_WHATSAPP_PHONE_NUMBER_ID = SAMPLE_PHONE_ID
      process.env.CHANNEL_WHATSAPP_APP_SECRET = SAMPLE_APP_SECRET
      mockFetch.mockResolvedValue(jsonResponse({ messages: [{ id: 'wamid.env' }] }))
      const p = createProvider()

      const result = await p.sendMessage('15551234567', { kind: 'text', text: 'env' })

      expect(result.messageId).toBe('wamid.env')
      const options = mockFetch.mock.calls[0][1]
      expect(options.headers.Authorization).toBe(`Bearer ${SAMPLE_TOKEN}`)
    })

    it('throws on a non-ok Cloud API response and redacts the access token', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse(
          {
            error: {
              message: `Bad token ${SAMPLE_TOKEN} not allowed`,
              code: 401,
            },
          },
          { status: 401 },
        ),
      )
      const p = makeProvider()

      try {
        await p.sendMessage('15551234567', { kind: 'text', text: 'x' })
        throw new Error('expected sendMessage to throw')
      } catch (error) {
        const msg = (error as Error).message
        expect(msg).toMatch(/Bad token \[redacted\] not allowed/)
        expect(msg).not.toContain(SAMPLE_TOKEN)
      }
    })

    it('throws on a network error and redacts the access token', async () => {
      mockFetch.mockRejectedValue(
        new Error(`fetch failed reaching graph.facebook.com (token=${SAMPLE_TOKEN})`),
      )
      const p = makeProvider()

      try {
        await p.sendMessage('15551234567', { kind: 'text', text: 'x' })
        throw new Error('expected sendMessage to throw')
      } catch (error) {
        const msg = (error as Error).message
        expect(msg).toMatch(/fetch failed/)
        expect(msg).toContain('[redacted]')
        expect(msg).not.toContain(SAMPLE_TOKEN)
        expect((error as Error).cause).toBeInstanceOf(Error)
      }
    })

    it('throws when the Cloud API response has no message id', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ messaging_product: 'whatsapp', messages: [] }))
      const p = makeProvider()

      await expect(p.sendMessage('15551234567', { kind: 'text', text: 'x' })).rejects.toThrow(
        /did not include a message id/i,
      )
    })

    it('passes an AbortSignal for timeout enforcement', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ messages: [{ id: 'wamid.1' }] }))
      const p = makeProvider()

      await p.sendMessage('15551234567', { kind: 'text', text: 'x' })
      const options = mockFetch.mock.calls[0][1]
      expect(options.signal).toBeInstanceOf(AbortSignal)
    })
  })

  describe('verifyWebhookSignature', () => {
    function signed(body: string): string {
      return `sha256=${createHmac('sha256', SAMPLE_APP_SECRET).update(body).digest('hex')}`
    }

    it('returns false when no app secret is configured', () => {
      const p = createProvider({ accessToken: SAMPLE_TOKEN, phoneNumberId: SAMPLE_PHONE_ID })
      expect(p.verifyWebhookSignature({ 'x-hub-signature-256': signed('{}') }, '{}')).toBe(false)
    })

    it('returns false when the signature header is missing', () => {
      const p = makeProvider()
      expect(p.verifyWebhookSignature({}, '{}')).toBe(false)
    })

    it('returns false when the signature header lacks the sha256= prefix', () => {
      const p = makeProvider()
      expect(p.verifyWebhookSignature({ 'x-hub-signature-256': 'deadbeef' }, '{}')).toBe(false)
    })

    it('returns true when the signature matches the configured secret', () => {
      const p = makeProvider()
      const body = '{"hello":"world"}'
      expect(p.verifyWebhookSignature({ 'x-hub-signature-256': signed(body) }, body)).toBe(true)
    })

    it('returns false when the signature is wrong', () => {
      const p = makeProvider()
      const wrong = `sha256=${createHmac('sha256', 'other-secret').update('{}').digest('hex')}`
      expect(p.verifyWebhookSignature({ 'x-hub-signature-256': wrong }, '{}')).toBe(false)
    })

    it('looks up the signature header case-insensitively', () => {
      const p = makeProvider()
      const body = 'hello'
      expect(p.verifyWebhookSignature({ 'X-Hub-Signature-256': signed(body) }, body)).toBe(true)
    })

    it('verifies Uint8Array bodies the same as string bodies', () => {
      const p = makeProvider()
      const body = Buffer.from('binary-body')
      expect(
        p.verifyWebhookSignature(
          { 'x-hub-signature-256': signed(body.toString('utf8')) },
          new Uint8Array(body),
        ),
      ).toBe(true)
    })
  })

  describe('parseInbound', () => {
    function envelope(message: Record<string, unknown>) {
      return {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WABA_ID',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { phone_number_id: SAMPLE_PHONE_ID },
                  contacts: [{ profile: { name: 'Ada' }, wa_id: '15551234567' }],
                  messages: [message],
                },
              },
            ],
          },
        ],
      }
    }

    it('throws on a non-object payload', () => {
      const p = makeProvider()
      expect(() => p.parseInbound(null)).toThrow(/not an object/)
      expect(() => p.parseInbound('hi')).toThrow(/not an object/)
      expect(() => p.parseInbound([])).toThrow(/not an object/)
    })

    it('throws when no entry/change is present', () => {
      const p = makeProvider()
      expect(() => p.parseInbound({ object: 'whatsapp_business_account' })).toThrow(
        /supported webhook variant/i,
      )
    })

    it('parses a plain text inbound message', () => {
      const p = makeProvider()
      const payload = envelope({
        id: 'wamid.1',
        from: '15551234567',
        timestamp: '1700000000',
        type: 'text',
        text: { body: 'hello' },
      })
      const inbound = p.parseInbound(payload)
      expect(inbound.from).toBe('15551234567')
      expect(inbound.channel).toBe('whatsapp')
      expect(inbound.text).toBe('hello')
      expect(inbound.payload).toBe(payload)
      expect(inbound.receivedAt).toEqual(new Date(1700000000 * 1000))
    })

    it('parses an image inbound message into an attachment with caption', () => {
      const p = makeProvider()
      const inbound = p.parseInbound(
        envelope({
          id: 'wamid.2',
          from: '15551234567',
          timestamp: '1700000000',
          type: 'image',
          image: { id: 'media_1', mime_type: 'image/jpeg', caption: 'look' },
        }),
      )
      expect(inbound.text).toBe('look')
      expect(inbound.attachments).toEqual([{ contentType: 'image/jpeg', caption: 'look' }])
    })

    it('parses a document inbound message preserving filename and mime', () => {
      const p = makeProvider()
      const inbound = p.parseInbound(
        envelope({
          id: 'wamid.3',
          from: '15551234567',
          timestamp: '1700000000',
          type: 'document',
          document: {
            id: 'media_2',
            filename: 'report.pdf',
            mime_type: 'application/pdf',
          },
        }),
      )
      expect(inbound.attachments).toEqual([
        { filename: 'report.pdf', contentType: 'application/pdf' },
      ])
    })

    it('parses an audio inbound message into an attachment', () => {
      const p = makeProvider()
      const inbound = p.parseInbound(
        envelope({
          id: 'wamid.4',
          from: '15551234567',
          type: 'audio',
          audio: { id: 'a1', mime_type: 'audio/ogg' },
        }),
      )
      expect(inbound.attachments).toEqual([{ contentType: 'audio/ogg' }])
    })

    it('parses a sticker inbound message', () => {
      const p = makeProvider()
      const inbound = p.parseInbound(
        envelope({
          id: 'wamid.5',
          from: '15551234567',
          type: 'sticker',
          sticker: { id: 's1', mime_type: 'image/webp' },
        }),
      )
      expect(inbound.attachments).toEqual([{ contentType: 'image/webp' }])
    })

    it('parses a location inbound message into a comma-separated text', () => {
      const p = makeProvider()
      const inbound = p.parseInbound(
        envelope({
          id: 'wamid.6',
          from: '15551234567',
          type: 'location',
          location: { latitude: 37.7, longitude: -122.4, name: 'SF', address: '1 Market St' },
        }),
      )
      expect(inbound.text).toBe('37.7,-122.4 SF 1 Market St')
    })

    it('parses a template button click into the button payload', () => {
      const p = makeProvider()
      const inbound = p.parseInbound(
        envelope({
          id: 'wamid.7',
          from: '15551234567',
          type: 'button',
          button: { payload: 'YES_PAYLOAD', text: 'Yes' },
        }),
      )
      expect(inbound.text).toBe('YES_PAYLOAD')
    })

    it('parses an interactive button reply into the reply id', () => {
      const p = makeProvider()
      const inbound = p.parseInbound(
        envelope({
          id: 'wamid.8',
          from: '15551234567',
          type: 'interactive',
          interactive: {
            type: 'button_reply',
            button_reply: { id: 'yes_id', title: 'Yes' },
          },
        }),
      )
      expect(inbound.text).toBe('yes_id')
    })

    it('returns a payload-only inbound for status / template-status events', () => {
      const p = makeProvider()
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WABA',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '+15550001111' },
                  statuses: [{ id: 'wamid.X', status: 'delivered' }],
                },
              },
            ],
          },
        ],
      }
      const inbound = p.parseInbound(payload)
      expect(inbound.from).toBe('+15550001111')
      expect(inbound.text).toBeUndefined()
      expect(inbound.attachments).toBeUndefined()
      expect(inbound.payload).toBe(payload)
    })
  })
})
