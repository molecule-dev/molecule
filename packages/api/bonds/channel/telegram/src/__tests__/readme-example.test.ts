/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to the
 * Telegram Bot API) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProviderByName, setProvider } from '@molecule/api-channel'

import { createProvider } from '../index.js'

describe('README @example', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('checks the secret token, parses /start and replies with an inline keyboard', async () => {
    process.env.CHANNEL_TELEGRAM_BOT_TOKEN = '123456:test-token'
    process.env.CHANNEL_TELEGRAM_WEBHOOK_SECRET = 'webhook-secret'
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            ok: true,
            result: { message_id: 42, date: 1727179200, chat: { id: 7 } },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      'telegram',
      createProvider({
        botToken: process.env.CHANNEL_TELEGRAM_BOT_TOKEN,
        webhookSecret: process.env.CHANNEL_TELEGRAM_WEBHOOK_SECRET,
      }),
    )
    const telegram = requireProviderByName('telegram')

    async function handleUpdate(headers: Record<string, string>, rawBody: string): Promise<number> {
      if (!telegram.verifyWebhookSignature(headers, rawBody)) return 401
      const inbound = telegram.parseInbound(JSON.parse(rawBody))
      if (inbound.text === '/start') {
        await telegram.sendMessage(inbound.from, {
          kind: 'rich',
          text: '<b>Welcome!</b> What do you need?',
          buttons: [
            { label: 'Track order', value: 'track' },
            { label: 'Talk to support', value: 'support' },
          ],
        })
      }
      return 200
    }

    const rawBody = JSON.stringify({
      update_id: 1,
      message: {
        message_id: 10,
        date: 1727179200,
        from: { id: 7, first_name: 'Ada' },
        chat: { id: 7, type: 'private' },
        text: '/start',
      },
    })

    expect(await handleUpdate({ 'X-Telegram-Bot-Api-Secret-Token': 'wrong' }, rawBody)).toBe(401)
    expect(
      await handleUpdate({ 'X-Telegram-Bot-Api-Secret-Token': 'webhook-secret' }, rawBody),
    ).toBe(200)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://api.telegram.org/bot123456:test-token/sendMessage')
    expect(JSON.parse(String(init?.body))).toEqual({
      chat_id: '7',
      parse_mode: 'HTML',
      text: '<b>Welcome!</b> What do you need?',
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Track order', callback_data: 'track' },
            { text: 'Talk to support', callback_data: 'support' },
          ],
        ],
      },
    })
  })
})
