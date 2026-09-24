/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to the
 * Messenger Send API) is stubbed; webhook signatures are real HMAC-SHA256.
 *
 * @module
 */
import { createHmac } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProviderByName, setProvider } from '@molecule/api-channel'

import { createProvider } from '../index.js'

describe('README @example', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('verifies a signed postback and replies to the sender with a button template', async () => {
    process.env.CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN = 'page-token'
    process.env.CHANNEL_MESSENGER_APP_SECRET = 'app-secret'
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ recipient_id: 'PSID-1', message_id: 'm_1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      'messenger',
      createProvider({
        pageAccessToken: process.env.CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN,
        appSecret: process.env.CHANNEL_MESSENGER_APP_SECRET,
      }),
    )
    const messenger = requireProviderByName('messenger')

    async function handleWebhook(
      headers: Record<string, string>,
      rawBody: string,
    ): Promise<number> {
      if (!messenger.verifyWebhookSignature(headers, rawBody)) return 401
      const inbound = messenger.parseInbound(JSON.parse(rawBody))
      if (inbound.text) {
        await messenger.sendMessage(inbound.from, {
          kind: 'rich',
          text: `You said: ${inbound.text}`,
          buttons: [{ label: 'Talk to a human', value: 'HANDOFF' }],
        })
      }
      return 200
    }

    const rawBody = JSON.stringify({
      object: 'page',
      entry: [
        {
          id: 'PAGE-1',
          time: 1727179200000,
          messaging: [
            {
              sender: { id: 'PSID-1' },
              recipient: { id: 'PAGE-1' },
              timestamp: 1727179200000,
              message: { mid: 'm_in', text: 'hello' },
            },
          ],
        },
      ],
    })
    const signature = `sha256=${createHmac('sha256', 'app-secret').update(rawBody).digest('hex')}`

    expect(await handleWebhook({ 'x-hub-signature-256': signature }, rawBody)).toBe(200)
    expect(await handleWebhook({ 'x-hub-signature-256': 'sha256=00' }, rawBody)).toBe(401)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://graph.facebook.com/v22.0/me/messages?access_token=page-token')
    expect(JSON.parse(String(init?.body))).toEqual({
      recipient: { id: 'PSID-1' },
      messaging_type: 'RESPONSE',
      message: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: 'You said: hello',
            buttons: [{ type: 'postback', title: 'Talk to a human', payload: 'HANDOFF' }],
          },
        },
      },
    })
  })
})
