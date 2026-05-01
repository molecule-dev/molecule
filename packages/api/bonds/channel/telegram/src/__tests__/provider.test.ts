/**
 * Tests for the Telegram channel provider.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, TelegramChannelProvider } from '../provider.js'

const SAMPLE_TOKEN = '123456:ABCDEF_FAKE_TOKEN'
const SAMPLE_SECRET = 's3cret-token-value'

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return {
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    status: init.status ?? 200,
    async json() {
      return body
    },
  } as Response
}

describe('@molecule/api-channel-telegram', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CHANNEL_TELEGRAM_BOT_TOKEN
    delete process.env.CHANNEL_TELEGRAM_WEBHOOK_SECRET
  })

  describe('provider name and features', () => {
    it('exposes the channel name "telegram"', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      expect(p.name).toBe('telegram')
    })

    it('listSupportedFeatures advertises text/buttons/attachments/threads', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      expect(p.listSupportedFeatures()).toEqual({
        text: true,
        buttons: true,
        attachments: true,
        threads: true,
        signedWebhooks: false,
      })
    })

    it('createProvider returns a TelegramChannelProvider instance', () => {
      expect(createProvider({ botToken: SAMPLE_TOKEN })).toBeInstanceOf(TelegramChannelProvider)
    })
  })

  describe('sendMessage', () => {
    it('throws when no bot token is configured', async () => {
      const p = createProvider()
      await expect(p.sendMessage('123', { kind: 'text', text: 'hi' })).rejects.toThrow(
        /bot token is not configured/i,
      )
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('POSTs JSON to sendMessage with chat_id, text, and HTML parse_mode', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ ok: true, result: { message_id: 42, date: 1700000000 } }),
      )
      const p = createProvider({ botToken: SAMPLE_TOKEN })

      const result = await p.sendMessage('100', { kind: 'text', text: 'hello' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe(`https://api.telegram.org/bot${SAMPLE_TOKEN}/sendMessage`)
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')
      const body = JSON.parse(options.body)
      expect(body).toEqual({ chat_id: '100', parse_mode: 'HTML', text: 'hello' })
      expect(result.messageId).toBe('42')
      expect(result.deliveredAt).toEqual(new Date(1700000000 * 1000))
    })

    it('honours configured defaultParseMode (MarkdownV2)', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ ok: true, result: { message_id: 1 } }))
      const p = createProvider({ botToken: SAMPLE_TOKEN, defaultParseMode: 'MarkdownV2' })

      await p.sendMessage('100', { kind: 'text', text: '*bold*' })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.parse_mode).toBe('MarkdownV2')
    })

    it('does not set parse_mode when no text body is given', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ ok: true, result: { message_id: 1 } }))
      const p = createProvider({ botToken: SAMPLE_TOKEN })

      await p.sendMessage('100', {
        kind: 'media',
        attachments: [{ url: 'https://example.com/a.pdf', contentType: 'application/pdf' }],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.parse_mode).toBeUndefined()
    })

    it('routes image attachments to sendPhoto', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ ok: true, result: { message_id: 1 } }))
      const p = createProvider({ botToken: SAMPLE_TOKEN })

      await p.sendMessage('100', {
        kind: 'media',
        text: 'caption!',
        attachments: [{ url: 'https://example.com/x.png', contentType: 'image/png' }],
      })

      const url = mockFetch.mock.calls[0][0]
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(url.endsWith('/sendPhoto')).toBe(true)
      expect(body.photo).toBe('https://example.com/x.png')
      expect(body.caption).toBe('caption!')
    })

    it('routes non-image attachments to sendDocument', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ ok: true, result: { message_id: 1 } }))
      const p = createProvider({ botToken: SAMPLE_TOKEN })

      await p.sendMessage('100', {
        kind: 'media',
        attachments: [{ url: 'https://example.com/x.pdf', contentType: 'application/pdf' }],
      })

      const url = mockFetch.mock.calls[0][0]
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(url.endsWith('/sendDocument')).toBe(true)
      expect(body.document).toBe('https://example.com/x.pdf')
    })

    it('detects images by filename extension when contentType is missing', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ ok: true, result: { message_id: 1 } }))
      const p = createProvider({ botToken: SAMPLE_TOKEN })

      await p.sendMessage('100', {
        kind: 'media',
        attachments: [{ url: 'https://example.com/pic.JPG', filename: 'pic.JPG' }],
      })

      expect(mockFetch.mock.calls[0][0].endsWith('/sendPhoto')).toBe(true)
    })

    it('attaches inline_keyboard reply_markup when buttons are provided', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ ok: true, result: { message_id: 1 } }))
      const p = createProvider({ botToken: SAMPLE_TOKEN })

      await p.sendMessage('100', {
        kind: 'rich',
        text: 'pick one',
        buttons: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.reply_markup).toEqual({
        inline_keyboard: [
          [
            { text: 'Yes', callback_data: 'yes' },
            { text: 'No', callback_data: 'no' },
          ],
        ],
      })
    })

    it('forwards thread_id to message_thread_id when numeric', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ ok: true, result: { message_id: 1 } }))
      const p = createProvider({ botToken: SAMPLE_TOKEN })

      await p.sendMessage('100', { kind: 'text', text: 'reply', thread_id: '7' })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.message_thread_id).toBe(7)
    })

    it('reads bot token from CHANNEL_TELEGRAM_BOT_TOKEN env var', async () => {
      process.env.CHANNEL_TELEGRAM_BOT_TOKEN = SAMPLE_TOKEN
      mockFetch.mockResolvedValue(jsonResponse({ ok: true, result: { message_id: 9 } }))
      const p = createProvider()

      await p.sendMessage('100', { kind: 'text', text: 'env' })

      expect(mockFetch.mock.calls[0][0]).toBe(
        `https://api.telegram.org/bot${SAMPLE_TOKEN}/sendMessage`,
      )
    })

    it('throws on a non-ok Bot API envelope without leaking the token', async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ ok: false, description: 'Bad Request: chat not found' }, { status: 400 }),
      )
      const p = createProvider({ botToken: SAMPLE_TOKEN })

      await expect(p.sendMessage('bogus', { kind: 'text', text: 'x' })).rejects.toThrow(
        /Bad Request: chat not found/,
      )

      try {
        await p.sendMessage('bogus', { kind: 'text', text: 'x' })
      } catch (error) {
        expect((error as Error).message).not.toContain(SAMPLE_TOKEN)
      }
    })

    it('throws on network error without leaking the bot token', async () => {
      mockFetch.mockRejectedValue(new Error('ENOTFOUND api.telegram.org'))
      const p = createProvider({ botToken: SAMPLE_TOKEN })

      try {
        await p.sendMessage('100', { kind: 'text', text: 'hi' })
        throw new Error('expected sendMessage to throw')
      } catch (error) {
        const msg = (error as Error).message
        expect(msg).toMatch(/ENOTFOUND/)
        expect(msg).toContain('<redacted>')
        expect(msg).not.toContain(SAMPLE_TOKEN)
      }
    })

    it('passes an AbortSignal for timeout enforcement', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ ok: true, result: { message_id: 1 } }))
      const p = createProvider({ botToken: SAMPLE_TOKEN })

      await p.sendMessage('100', { kind: 'text', text: 'x' })
      const options = mockFetch.mock.calls[0][1]
      expect(options.signal).toBeInstanceOf(AbortSignal)
    })
  })

  describe('verifyWebhookSignature', () => {
    it('returns false when no webhook secret is configured', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      expect(
        p.verifyWebhookSignature({ 'x-telegram-bot-api-secret-token': SAMPLE_SECRET }, ''),
      ).toBe(false)
    })

    it('returns false when the secret-token header is missing', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN, webhookSecret: SAMPLE_SECRET })
      expect(p.verifyWebhookSignature({}, '')).toBe(false)
    })

    it('returns true when the header value matches the configured secret', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN, webhookSecret: SAMPLE_SECRET })
      expect(
        p.verifyWebhookSignature({ 'x-telegram-bot-api-secret-token': SAMPLE_SECRET }, ''),
      ).toBe(true)
    })

    it('returns false when the header value differs', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN, webhookSecret: SAMPLE_SECRET })
      expect(p.verifyWebhookSignature({ 'x-telegram-bot-api-secret-token': 'wrong' }, '')).toBe(
        false,
      )
    })

    it('looks up the header case-insensitively', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN, webhookSecret: SAMPLE_SECRET })
      expect(
        p.verifyWebhookSignature({ 'X-Telegram-Bot-Api-Secret-Token': SAMPLE_SECRET }, ''),
      ).toBe(true)
    })
  })

  describe('parseInbound', () => {
    it('throws on a non-object payload', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      expect(() => p.parseInbound(null)).toThrow(/not an object/)
      expect(() => p.parseInbound('hi')).toThrow(/not an object/)
      expect(() => p.parseInbound([])).toThrow(/not an object/)
    })

    it('throws when no recognized variant is present', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      expect(() => p.parseInbound({ update_id: 1 })).toThrow(/supported update variant/)
    })

    it('parses a plain text message', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      const update = {
        update_id: 1,
        message: {
          message_id: 5,
          date: 1700000000,
          from: { id: 99, is_bot: false, first_name: 'Ada' },
          chat: { id: 99, type: 'private' },
          text: 'hello',
        },
      }
      const inbound = p.parseInbound(update)
      expect(inbound).toMatchObject({
        from: '99',
        channel: 'telegram',
        text: 'hello',
      })
      expect(inbound.payload).toBe(update)
      expect(inbound.receivedAt).toEqual(new Date(1700000000 * 1000))
    })

    it('parses edited_message, channel_post, and edited_channel_post', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      const message = {
        message_id: 1,
        date: 1700000000,
        chat: { id: 1, type: 'channel' },
        text: 'edited',
      }
      for (const key of ['edited_message', 'channel_post', 'edited_channel_post'] as const) {
        const inbound = p.parseInbound({ update_id: 1, [key]: message })
        expect(inbound.text).toBe('edited')
      }
    })

    it('parses a photo message and reports the largest size as an attachment', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      const inbound = p.parseInbound({
        update_id: 2,
        message: {
          message_id: 6,
          date: 1700000000,
          from: { id: 99, is_bot: false },
          chat: { id: 99, type: 'private' },
          caption: 'look',
          photo: [
            { file_id: 'small', file_unique_id: 'u-small', width: 90 },
            { file_id: 'large', file_unique_id: 'u-large', width: 1280 },
          ],
        },
      })
      expect(inbound.text).toBe('look')
      expect(inbound.attachments).toHaveLength(1)
      const att = inbound.attachments![0]
      expect(att.contentType).toBe('image/jpeg')
      expect(att.filename).toBe('u-large')
      expect(att.caption).toBe('look')
    })

    it('parses a document message into an attachment with its filename and mime', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      const inbound = p.parseInbound({
        update_id: 3,
        message: {
          message_id: 7,
          date: 1700000000,
          from: { id: 1, is_bot: false },
          chat: { id: 1, type: 'private' },
          document: {
            file_id: 'd1',
            file_unique_id: 'u-d1',
            file_name: 'report.pdf',
            mime_type: 'application/pdf',
          },
        },
      })
      expect(inbound.attachments).toEqual([
        { filename: 'report.pdf', contentType: 'application/pdf' },
      ])
    })

    it('captures forum-topic threading via message_thread_id', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      const inbound = p.parseInbound({
        update_id: 4,
        message: {
          message_id: 8,
          date: 1700000000,
          from: { id: 1, is_bot: false },
          chat: { id: -100, type: 'supergroup' },
          text: 'topic reply',
          message_thread_id: 11,
          is_topic_message: true,
        },
      })
      expect(inbound.thread_id).toBe('11')
    })

    it('parses a callback_query into a normalized inbound message', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      const inbound = p.parseInbound({
        update_id: 5,
        callback_query: {
          id: 'cb1',
          from: { id: 42, is_bot: false },
          data: 'yes',
          message: {
            message_id: 1,
            chat: { id: -100, type: 'supergroup' },
            message_thread_id: 7,
          },
        },
      })
      expect(inbound.from).toBe('42')
      expect(inbound.text).toBe('yes')
      expect(inbound.thread_id).toBe('7')
    })

    it('parses an inline_query into a normalized inbound message', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      const inbound = p.parseInbound({
        update_id: 6,
        inline_query: {
          id: 'iq1',
          from: { id: 7, is_bot: false },
          query: 'cats',
        },
      })
      expect(inbound.from).toBe('7')
      expect(inbound.text).toBe('cats')
    })

    it('falls back to chat.id when from.id is missing', () => {
      const p = createProvider({ botToken: SAMPLE_TOKEN })
      const inbound = p.parseInbound({
        update_id: 7,
        channel_post: {
          message_id: 1,
          date: 1700000000,
          chat: { id: -100123, type: 'channel' },
          text: 'announcement',
        },
      })
      expect(inbound.from).toBe('-100123')
    })
  })
})
