/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to the
 * WhatsApp Cloud API) is stubbed; webhook signatures are real HMAC-SHA256.
 *
 * @module
 */
import { createHmac } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { OutboundMessage } from '@molecule/api-channel'
import { requireProviderByName, setProvider } from '@molecule/api-channel'

import type { WhatsAppOutboundExtensions } from '../index.js'
import { createProvider } from '../index.js'

describe('README @example', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
  })

  it('sends an approved template and replies to a signed inbound message with buttons', async () => {
    process.env.CHANNEL_WHATSAPP_ACCESS_TOKEN = 'wa-token'
    process.env.CHANNEL_WHATSAPP_PHONE_NUMBER_ID = '1098765'
    process.env.CHANNEL_WHATSAPP_APP_SECRET = 'app-secret'
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      'whatsapp',
      createProvider({
        accessToken: process.env.CHANNEL_WHATSAPP_ACCESS_TOKEN,
        phoneNumberId: process.env.CHANNEL_WHATSAPP_PHONE_NUMBER_ID,
        appSecret: process.env.CHANNEL_WHATSAPP_APP_SECRET,
      }),
    )
    const whatsapp = requireProviderByName('whatsapp')

    const shipped: OutboundMessage & { payload: WhatsAppOutboundExtensions } = {
      kind: 'rich',
      payload: {
        template: { name: 'order_shipped', language: 'en_US', bodyParameters: ['Ada', '#1042'] },
      },
    }
    const sent = await whatsapp.sendMessage('15551234567', shipped)
    expect(sent.messageId).toBe('wamid.1')

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://graph.facebook.com/v22.0/1098765/messages')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer wa-token')
    expect(JSON.parse(String(init?.body))).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '15551234567',
      type: 'template',
      template: {
        name: 'order_shipped',
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Ada' },
              { type: 'text', text: '#1042' },
            ],
          },
        ],
      },
    })

    async function handleWebhook(
      headers: Record<string, string>,
      rawBody: string,
    ): Promise<number> {
      if (!whatsapp.verifyWebhookSignature(headers, rawBody)) return 401
      const inbound = whatsapp.parseInbound(JSON.parse(rawBody))
      if (inbound.text) {
        await whatsapp.sendMessage(inbound.from, {
          kind: 'rich',
          text: 'How can we help?',
          buttons: [{ label: 'Track order', value: 'track' }],
        })
      }
      return 200
    }

    const rawBody = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA-1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '15550000000', phone_number_id: '1098765' },
                messages: [
                  {
                    from: '15551234567',
                    id: 'wamid.in',
                    timestamp: '1727179200',
                    type: 'text',
                    text: { body: 'hi' },
                  },
                ],
              },
            },
          ],
        },
      ],
    })
    const signature = `sha256=${createHmac('sha256', 'app-secret').update(rawBody).digest('hex')}`

    expect(await handleWebhook({ 'X-Hub-Signature-256': 'sha256=00' }, rawBody)).toBe(401)
    expect(await handleWebhook({ 'X-Hub-Signature-256': signature }, rawBody)).toBe(200)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '15551234567',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'How can we help?' },
        action: { buttons: [{ type: 'reply', reply: { id: 'track', title: 'Track order' } }] },
      },
    })
  })
})
