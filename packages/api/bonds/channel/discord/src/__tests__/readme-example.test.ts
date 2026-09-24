/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the network (`fetch` to Discord's
 * REST API) is stubbed; interaction signatures are real ed25519 signatures made
 * with a throwaway key pair.
 *
 * @module
 */
import { generateKeyPairSync, sign } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProviderByName, setProvider } from '@molecule/api-channel'

import { createProvider } from '../index.js'

describe('README @example', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('posts a rich message with a button and handles signed interactions', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519')
    const rawPublicKey = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32)
    process.env.CHANNEL_DISCORD_BOT_TOKEN = 'discord-test'
    process.env.CHANNEL_DISCORD_PUBLIC_KEY = rawPublicKey.toString('hex')
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ id: '998877', timestamp: '2026-09-24T12:00:00.000Z' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(
      'discord',
      createProvider({
        botToken: process.env.CHANNEL_DISCORD_BOT_TOKEN,
        publicKey: process.env.CHANNEL_DISCORD_PUBLIC_KEY,
      }),
    )

    const discord = requireProviderByName('discord')
    const sent = await discord.sendMessage('112233445566778899', {
      kind: 'rich',
      text: 'New signup: ada@example.com',
      buttons: [{ label: 'Approve', value: 'approve:user-123' }],
    })
    console.log(sent.messageId)

    expect(sent.messageId).toBe('998877')
    expect(sent.deliveredAt).toEqual(new Date('2026-09-24T12:00:00.000Z'))
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://discord.com/api/v10/channels/112233445566778899/messages')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bot discord-test')
    expect(JSON.parse(String(init?.body))).toMatchObject({
      content: 'New signup: ada@example.com',
      components: [{ type: 1, components: [{ label: 'Approve', custom_id: 'approve:user-123' }] }],
    })

    function handleInteraction(
      headers: Record<string, string>,
      rawBody: string,
    ): { status: number; body: unknown } {
      if (!discord.verifyWebhookSignature(headers, rawBody))
        return { status: 401, body: 'bad signature' }
      const payload = JSON.parse(rawBody) as { type: number }
      if (payload.type === 1) return { status: 200, body: { type: 1 } }
      const inbound = discord.parseInbound(payload)
      return { status: 200, body: { type: 4, data: { content: `Got ${inbound.text}` } } }
    }

    const signed = (rawBody: string): Record<string, string> => {
      const timestamp = '1727179200'
      return {
        'x-signature-timestamp': timestamp,
        'x-signature-ed25519': sign(null, Buffer.from(timestamp + rawBody), privateKey).toString(
          'hex',
        ),
      }
    }

    const ping = JSON.stringify({ type: 1 })
    expect(handleInteraction(signed(ping), ping)).toEqual({ status: 200, body: { type: 1 } })

    const click = JSON.stringify({
      type: 3,
      channel_id: '112233445566778899',
      member: { user: { id: '4455' } },
      data: { custom_id: 'approve:user-123' },
    })
    expect(handleInteraction(signed(click), click)).toEqual({
      status: 200,
      body: { type: 4, data: { content: 'Got approve:user-123' } },
    })

    expect(handleInteraction(signed(click), `${click} `)).toEqual({
      status: 401,
      body: 'bad signature',
    })
  })
})
