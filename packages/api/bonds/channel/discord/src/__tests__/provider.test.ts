/**
 * Tests for the Discord channel provider.
 *
 * Outbound REST is exercised through both the injected `rest` shape
 * (matching the surface of `discord.js`'s `REST` class) and the built-in
 * `fetch` fallback. Inbound signature verification uses a real ed25519
 * keypair generated at test time so the production `crypto.verify` path
 * is exercised end-to-end.
 */

import {
  createPrivateKey,
  generateKeyPairSync,
  type KeyObject,
  sign as cryptoSign,
} from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider, DiscordChannelProvider } from '../provider.js'

interface KeyPair {
  publicHex: string
  privateKey: KeyObject
}

/**
 * Generates a fresh ed25519 keypair and returns the raw 32-byte public
 * key as hex (matching the format Discord publishes) plus the
 * `KeyObject` private key for signing.
 *
 * @returns Hex-encoded public key + private KeyObject for signing.
 */
function generateEd25519KeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const der = publicKey.export({ format: 'der', type: 'spki' })
  // Raw 32-byte key sits at the end of the SPKI DER block.
  const raw = der.subarray(der.length - 32)
  return {
    publicHex: Buffer.from(raw).toString('hex'),
    privateKey: createPrivateKey(privateKey.export({ format: 'pem', type: 'pkcs8' })),
  }
}

/**
 * Signs a Discord-style webhook payload (timestamp + body) and returns a
 * complete header map plus the body bytes.
 *
 * @param privateKey - The ed25519 signing key.
 * @param body - Raw body string.
 * @param timestamp - Optional timestamp (defaults to a fixed value).
 * @returns Header map and body for use in `verifyWebhookSignature`.
 */
function signWebhook(
  privateKey: KeyObject,
  body: string,
  timestamp = '1700000000',
): { headers: Record<string, string>; body: string } {
  const signed = Buffer.concat([Buffer.from(timestamp, 'utf8'), Buffer.from(body, 'utf8')])
  const signature = cryptoSign(null, signed, privateKey)
  return {
    headers: {
      'x-signature-ed25519': Buffer.from(signature).toString('hex'),
      'x-signature-timestamp': timestamp,
    },
    body,
  }
}

describe('@molecule/api-channel-discord', () => {
  const originalToken = process.env.CHANNEL_DISCORD_BOT_TOKEN
  const originalKey = process.env.CHANNEL_DISCORD_PUBLIC_KEY

  afterEach(() => {
    if (originalToken === undefined) delete process.env.CHANNEL_DISCORD_BOT_TOKEN
    else process.env.CHANNEL_DISCORD_BOT_TOKEN = originalToken
    if (originalKey === undefined) delete process.env.CHANNEL_DISCORD_PUBLIC_KEY
    else process.env.CHANNEL_DISCORD_PUBLIC_KEY = originalKey
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe('provider.name', () => {
    it('is "discord"', () => {
      const provider = createProvider({ botToken: 'tok' })
      expect(provider.name).toBe('discord')
    })
  })

  describe('listSupportedFeatures', () => {
    it('reports text, buttons, attachments, threads, and signed webhooks', () => {
      const provider = createProvider({ botToken: 'tok' })
      const features = provider.listSupportedFeatures()
      expect(features).toEqual({
        text: true,
        buttons: true,
        attachments: true,
        threads: true,
        signedWebhooks: true,
      })
    })

    it('returns the same frozen object on repeat calls', () => {
      const provider = createProvider({ botToken: 'tok' })
      expect(provider.listSupportedFeatures()).toBe(provider.listSupportedFeatures())
      expect(Object.isFrozen(provider.listSupportedFeatures())).toBe(true)
    })
  })

  describe('sendMessage via injected REST (discord.js mock)', () => {
    const restMock = { post: vi.fn() }

    beforeEach(() => {
      restMock.post.mockReset()
    })

    it('POSTs to /channels/:id/messages and returns the message id + timestamp', async () => {
      restMock.post.mockResolvedValue({ id: '987', timestamp: '2026-05-01T00:00:00.000Z' })
      const provider = createProvider({ botToken: 'tok', rest: restMock })

      const result = await provider.sendMessage('123', { kind: 'text', text: 'hello' })

      expect(restMock.post).toHaveBeenCalledTimes(1)
      const [route, options] = restMock.post.mock.calls[0]
      expect(route).toBe('/channels/123/messages')
      expect(options.body).toEqual({ content: 'hello' })
      expect(result.messageId).toBe('987')
      expect(result.deliveredAt).toEqual(new Date('2026-05-01T00:00:00.000Z'))
    })

    it('translates buttons into a Discord ACTION_ROW with BUTTON components', async () => {
      restMock.post.mockResolvedValue({ id: '1', timestamp: '2026-05-01T00:00:00.000Z' })
      const provider = createProvider({ botToken: 'tok', rest: restMock })

      await provider.sendMessage('chan', {
        kind: 'rich',
        text: 'pick one',
        buttons: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ],
      })

      const body = restMock.post.mock.calls[0][1].body
      expect(body.components).toEqual([
        {
          type: 1,
          components: [
            { type: 2, style: 1, label: 'A', custom_id: 'a' },
            { type: 2, style: 1, label: 'B', custom_id: 'b' },
          ],
        },
      ])
    })

    it('translates URL attachments into Discord embeds (with image for image/* types)', async () => {
      restMock.post.mockResolvedValue({ id: '2', timestamp: '2026-05-01T00:00:00.000Z' })
      const provider = createProvider({ botToken: 'tok', rest: restMock })

      await provider.sendMessage('chan', {
        kind: 'media',
        attachments: [
          {
            url: 'https://cdn.example/p.png',
            contentType: 'image/png',
            caption: 'a picture',
          },
          { url: 'https://cdn.example/d.pdf', contentType: 'application/pdf' },
        ],
      })

      const body = restMock.post.mock.calls[0][1].body
      expect(body.embeds).toEqual([
        {
          url: 'https://cdn.example/p.png',
          description: 'a picture',
          image: { url: 'https://cdn.example/p.png' },
        },
        { url: 'https://cdn.example/d.pdf' },
      ])
    })

    it('skips attachments without a URL (raw byte data is unsupported via embeds)', async () => {
      restMock.post.mockResolvedValue({ id: '3', timestamp: '2026-05-01T00:00:00.000Z' })
      const provider = createProvider({ botToken: 'tok', rest: restMock })

      await provider.sendMessage('chan', {
        kind: 'media',
        attachments: [{ data: new Uint8Array([1, 2, 3]), filename: 'r.bin' }],
      })

      const body = restMock.post.mock.calls[0][1].body
      expect(body.embeds).toBeUndefined()
    })

    it('forwards thread_id when posting into a thread', async () => {
      restMock.post.mockResolvedValue({ id: '4', timestamp: '2026-05-01T00:00:00.000Z' })
      const provider = createProvider({ botToken: 'tok', rest: restMock })

      await provider.sendMessage('parent-channel', {
        kind: 'text',
        text: 'reply',
        thread_id: 'thread-1',
      })

      expect(restMock.post.mock.calls[0][1].body).toMatchObject({
        content: 'reply',
        thread_id: 'thread-1',
      })
    })

    it('throws if the channel id is missing', async () => {
      const provider = createProvider({ botToken: 'tok', rest: restMock })
      await expect(provider.sendMessage('', { kind: 'text', text: 'x' })).rejects.toThrow(
        /channel id is required/i,
      )
      expect(restMock.post).not.toHaveBeenCalled()
    })

    it('falls back to a current timestamp when Discord omits one', async () => {
      restMock.post.mockResolvedValue({ id: '5' })
      const provider = createProvider({ botToken: 'tok', rest: restMock })

      const before = Date.now()
      const result = await provider.sendMessage('c', { kind: 'text', text: 'x' })
      const after = Date.now()
      expect(result.deliveredAt.getTime()).toBeGreaterThanOrEqual(before)
      expect(result.deliveredAt.getTime()).toBeLessThanOrEqual(after)
    })
  })

  describe('sendMessage via built-in fetch (no REST client)', () => {
    it('POSTs JSON with the bot token to the Discord API', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'abc', timestamp: '2026-05-01T01:02:03.000Z' }),
      })
      vi.stubGlobal('fetch', fetchMock)
      const provider = createProvider({
        botToken: 'mytoken',
        apiBaseUrl: 'https://api.test/v10',
      })

      const result = await provider.sendMessage('cid', { kind: 'text', text: 'hi' })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toBe('https://api.test/v10/channels/cid/messages')
      expect(options.method).toBe('POST')
      expect(options.headers.Authorization).toBe('Bot mytoken')
      expect(options.headers['Content-Type']).toBe('application/json')
      expect(JSON.parse(options.body)).toEqual({ content: 'hi' })
      expect(result.messageId).toBe('abc')
    })

    it('throws when the bot token is missing', async () => {
      const provider = createProvider({})
      await expect(provider.sendMessage('cid', { kind: 'text', text: 'hi' })).rejects.toThrow(
        /bot token not configured/i,
      )
    })

    it('throws on non-2xx Discord responses', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
      )
      const provider = createProvider({ botToken: 'tok' })
      await expect(provider.sendMessage('cid', { kind: 'text', text: 'hi' })).rejects.toThrow(
        /HTTP 401/,
      )
    })

    it('reads bot token from CHANNEL_DISCORD_BOT_TOKEN env var', async () => {
      process.env.CHANNEL_DISCORD_BOT_TOKEN = 'env-token'
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'x', timestamp: '2026-05-01T00:00:00.000Z' }),
      })
      vi.stubGlobal('fetch', fetchMock)

      const provider = createProvider()
      await provider.sendMessage('c', { kind: 'text', text: 'h' })

      expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bot env-token')
    })
  })

  describe('verifyWebhookSignature', () => {
    it('returns true for a valid ed25519 signature', () => {
      const { publicHex, privateKey } = generateEd25519KeyPair()
      const provider = createProvider({ publicKey: publicHex })

      const { headers, body } = signWebhook(privateKey, '{"type":1}')
      expect(provider.verifyWebhookSignature(headers, body)).toBe(true)
    })

    it('returns true when the body is supplied as a Uint8Array', () => {
      const { publicHex, privateKey } = generateEd25519KeyPair()
      const provider = createProvider({ publicKey: publicHex })

      const { headers, body } = signWebhook(privateKey, '{"type":2,"data":{"name":"ping"}}')
      expect(provider.verifyWebhookSignature(headers, new TextEncoder().encode(body))).toBe(true)
    })

    it('returns false when the body has been tampered with', () => {
      const { publicHex, privateKey } = generateEd25519KeyPair()
      const provider = createProvider({ publicKey: publicHex })

      const { headers } = signWebhook(privateKey, '{"type":1}')
      expect(provider.verifyWebhookSignature(headers, '{"type":99}')).toBe(false)
    })

    it('returns false when the timestamp has been changed', () => {
      const { publicHex, privateKey } = generateEd25519KeyPair()
      const provider = createProvider({ publicKey: publicHex })

      const { headers, body } = signWebhook(privateKey, '{"type":1}', '1700000000')
      headers['x-signature-timestamp'] = '1700000001'
      expect(provider.verifyWebhookSignature(headers, body)).toBe(false)
    })

    it('returns false when signed with a different key', () => {
      const correct = generateEd25519KeyPair()
      const wrong = generateEd25519KeyPair()
      const provider = createProvider({ publicKey: correct.publicHex })

      const { headers, body } = signWebhook(wrong.privateKey, '{"type":1}')
      expect(provider.verifyWebhookSignature(headers, body)).toBe(false)
    })

    it('returns false when the signature header is missing', () => {
      const { publicHex } = generateEd25519KeyPair()
      const provider = createProvider({ publicKey: publicHex })
      expect(provider.verifyWebhookSignature({ 'x-signature-timestamp': '1' }, 'body')).toBe(false)
    })

    it('returns false when the timestamp header is missing', () => {
      const { publicHex } = generateEd25519KeyPair()
      const provider = createProvider({ publicKey: publicHex })
      expect(
        provider.verifyWebhookSignature({ 'x-signature-ed25519': 'aa'.repeat(64) }, 'body'),
      ).toBe(false)
    })

    it('returns false when the signature is the wrong byte length', () => {
      const { publicHex, privateKey } = generateEd25519KeyPair()
      const provider = createProvider({ publicKey: publicHex })
      const { headers, body } = signWebhook(privateKey, 'x')
      headers['x-signature-ed25519'] = 'ab'.repeat(10)
      expect(provider.verifyWebhookSignature(headers, body)).toBe(false)
    })

    it('returns false when no public key is configured', () => {
      const provider = createProvider({})
      expect(
        provider.verifyWebhookSignature(
          {
            'x-signature-ed25519': 'aa'.repeat(64),
            'x-signature-timestamp': '1',
          },
          'b',
        ),
      ).toBe(false)
    })

    it('reads the public key from CHANNEL_DISCORD_PUBLIC_KEY env var', () => {
      const { publicHex, privateKey } = generateEd25519KeyPair()
      process.env.CHANNEL_DISCORD_PUBLIC_KEY = publicHex
      const provider = createProvider()
      const { headers, body } = signWebhook(privateKey, '{"type":1}')
      expect(provider.verifyWebhookSignature(headers, body)).toBe(true)
    })

    it('looks up headers case-insensitively', () => {
      const { publicHex, privateKey } = generateEd25519KeyPair()
      const provider = createProvider({ publicKey: publicHex })
      const { headers, body } = signWebhook(privateKey, 'b')
      const upperHeaders: Record<string, string> = {
        'X-Signature-Ed25519': headers['x-signature-ed25519'],
        'X-Signature-Timestamp': headers['x-signature-timestamp'],
      }
      expect(provider.verifyWebhookSignature(upperHeaders, body)).toBe(true)
    })
  })

  describe('parseInbound', () => {
    it('normalises a slash-command interaction', () => {
      const provider = new DiscordChannelProvider({ botToken: 'tok' })
      const payload = {
        type: 2,
        channel_id: 'C1',
        member: { user: { id: 'U1' } },
        data: { name: 'help' },
      }
      const inbound = provider.parseInbound(payload)
      expect(inbound).toMatchObject({
        from: 'U1',
        channel: 'discord',
        text: '/help',
        thread_id: 'C1',
        payload,
      })
      expect(inbound.receivedAt).toBeInstanceOf(Date)
    })

    it('normalises a message-component (button click) interaction', () => {
      const provider = createProvider({ botToken: 'tok' })
      const inbound = provider.parseInbound({
        type: 3,
        channel: { id: 'C2' },
        user: { id: 'U2' },
        data: { custom_id: 'btn-yes' },
      })
      expect(inbound).toMatchObject({
        from: 'U2',
        channel: 'discord',
        text: 'btn-yes',
        thread_id: 'C2',
      })
    })

    it('surfaces inbound attachments', () => {
      const provider = createProvider({ botToken: 'tok' })
      const inbound = provider.parseInbound({
        type: 3,
        channel: { id: 'C' },
        user: { id: 'U' },
        data: { custom_id: 'btn' },
        message: {
          attachments: [
            {
              filename: 'a.png',
              content_type: 'image/png',
              url: 'https://cdn/a.png',
            },
          ],
        },
      })
      expect(inbound.attachments).toEqual([
        { filename: 'a.png', contentType: 'image/png', url: 'https://cdn/a.png' },
      ])
    })

    it('returns an inbound without text for unrecognised interaction types', () => {
      const provider = createProvider({ botToken: 'tok' })
      const inbound = provider.parseInbound({
        type: 5, // MODAL_SUBMIT, not handled explicitly.
        channel_id: 'C',
        user: { id: 'U' },
      })
      expect(inbound.text).toBeUndefined()
      expect(inbound.from).toBe('U')
      expect(inbound.thread_id).toBe('C')
    })

    it('preserves the raw payload for forensic inspection', () => {
      const provider = createProvider({ botToken: 'tok' })
      const payload = { type: 2, channel_id: 'C', user: { id: 'U' }, data: { name: 'x' } }
      const inbound = provider.parseInbound(payload)
      expect(inbound.payload).toBe(payload)
    })

    it('throws on null / non-object payloads', () => {
      const provider = createProvider({ botToken: 'tok' })
      expect(() => provider.parseInbound(null)).toThrow(/object/)
      expect(() => provider.parseInbound('s')).toThrow(/object/)
    })
  })
})
