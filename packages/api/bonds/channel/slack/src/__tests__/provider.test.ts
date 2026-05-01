/**
 * Unit tests for the Slack channel provider.
 *
 * These tests exercise the provider against a hand-rolled WebClient stub
 * — the real `@slack/web-api` is never imported here, keeping the suite
 * fast and offline.
 */

import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { OutboundMessage } from '@molecule/api-channel'

import { createProvider } from '../provider.js'
import type { SlackChatPostMessageArgs, SlackWebClientLike } from '../types.js'

const SIGNING_SECRET = 'test-signing-secret'
const BOT_TOKEN = 'xoxb-test-token-12345'

interface CapturedCall {
  args: SlackChatPostMessageArgs
}

function buildWebClient(
  response: { ok: boolean; ts?: string; error?: string } = { ok: true, ts: '1700000000.000100' },
): { client: SlackWebClientLike; calls: CapturedCall[] } {
  const calls: CapturedCall[] = []
  const client: SlackWebClientLike = {
    chat: {
      async postMessage(args) {
        calls.push({ args })
        return response
      },
    },
  }
  return { client, calls }
}

function signRequest(secret: string, body: string, timestamp: number): string {
  const basestring = `v0:${timestamp}:${body}`
  return `v0=${createHmac('sha256', secret).update(basestring).digest('hex')}`
}

describe('@molecule/api-channel-slack', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2023-11-14T22:13:20.000Z')) // 1700000000 epoch seconds
  })

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.SLACK_BOT_TOKEN
    delete process.env.SLACK_SIGNING_SECRET
  })

  describe('name', () => {
    it('is "slack"', () => {
      const { client } = buildWebClient()
      const provider = createProvider({ botToken: BOT_TOKEN, webClient: client })

      expect(provider.name).toBe('slack')
    })
  })

  describe('listSupportedFeatures', () => {
    it('reports the documented capability matrix', () => {
      const provider = createProvider({})

      expect(provider.listSupportedFeatures()).toEqual({
        text: true,
        buttons: true,
        attachments: true,
        threads: true,
        signedWebhooks: true,
      })
    })
  })

  describe('sendMessage', () => {
    it('calls chat.postMessage with plain text for kind="text"', async () => {
      const { client, calls } = buildWebClient()
      const provider = createProvider({ botToken: BOT_TOKEN, webClient: client })

      const result = await provider.sendMessage('C123', { kind: 'text', text: 'hello' })

      expect(calls).toHaveLength(1)
      expect(calls[0].args).toEqual({ channel: 'C123', text: 'hello' })
      expect(result.messageId).toBe('1700000000.000100')
      expect(result.deliveredAt).toBeInstanceOf(Date)
    })

    it('renders buttons as a Slack block kit actions block when kind="rich"', async () => {
      const { client, calls } = buildWebClient()
      const provider = createProvider({ botToken: BOT_TOKEN, webClient: client })

      const message: OutboundMessage = {
        kind: 'rich',
        text: 'Pick one',
        buttons: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      }

      await provider.sendMessage('C123', message)

      const args = calls[0].args
      expect(args.text).toBe('Pick one')
      expect(args.blocks).toBeDefined()
      expect(args.blocks).toHaveLength(2)
      expect(args.blocks?.[0]).toMatchObject({ type: 'section' })
      expect(args.blocks?.[1]).toMatchObject({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Yes' },
            value: 'yes',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'No' },
            value: 'no',
          },
        ],
      })
    })

    it('passes thread_id through as thread_ts', async () => {
      const { client, calls } = buildWebClient()
      const provider = createProvider({ botToken: BOT_TOKEN, webClient: client })

      await provider.sendMessage('C123', {
        kind: 'text',
        text: 'reply',
        thread_id: '1699999000.000001',
      })

      expect(calls[0].args.thread_ts).toBe('1699999000.000001')
    })

    it('throws a sanitised error when chat.postMessage rejects', async () => {
      const client: SlackWebClientLike = {
        chat: {
          async postMessage() {
            throw new Error(`network refused with token ${BOT_TOKEN}`)
          },
        },
      }
      const provider = createProvider({ botToken: BOT_TOKEN, webClient: client })

      await expect(provider.sendMessage('C123', { kind: 'text', text: 'hi' })).rejects.toThrowError(
        /Slack chat\.postMessage failed/,
      )

      const err = await provider
        .sendMessage('C123', { kind: 'text', text: 'hi' })
        .catch((e: Error) => e)
      // The bot token must NEVER appear in the surfaced error message.
      expect(String(err)).not.toContain(BOT_TOKEN)
    })

    it('throws when chat.postMessage returns ok:false', async () => {
      const { client } = buildWebClient({ ok: false, error: 'channel_not_found' })
      const provider = createProvider({ botToken: BOT_TOKEN, webClient: client })

      await expect(provider.sendMessage('C123', { kind: 'text', text: 'hi' })).rejects.toThrowError(
        /channel_not_found/,
      )
    })

    it('throws when no bot token is configured (env is empty)', async () => {
      const provider = createProvider({})

      await expect(provider.sendMessage('C123', { kind: 'text', text: 'hi' })).rejects.toThrowError(
        /bot token/i,
      )
    })
  })

  describe('verifyWebhookSignature', () => {
    it('returns true for a valid signature inside the tolerance window', () => {
      const provider = createProvider({ signingSecret: SIGNING_SECRET })
      const body = '{"type":"event_callback"}'
      const ts = 1700000000

      const headers = {
        'X-Slack-Signature': signRequest(SIGNING_SECRET, body, ts),
        'X-Slack-Request-Timestamp': String(ts),
      }

      expect(provider.verifyWebhookSignature(headers, body)).toBe(true)
    })

    it('accepts Uint8Array bodies', () => {
      const provider = createProvider({ signingSecret: SIGNING_SECRET })
      const body = '{"type":"event_callback"}'
      const ts = 1700000000

      const headers = {
        'x-slack-signature': signRequest(SIGNING_SECRET, body, ts),
        'x-slack-request-timestamp': String(ts),
      }

      const bytes = new TextEncoder().encode(body)
      expect(provider.verifyWebhookSignature(headers, bytes)).toBe(true)
    })

    it('returns false on signature mismatch', () => {
      const provider = createProvider({ signingSecret: SIGNING_SECRET })
      const body = '{"type":"event_callback"}'
      const ts = 1700000000

      const headers = {
        'x-slack-signature': 'v0=deadbeef',
        'x-slack-request-timestamp': String(ts),
      }

      expect(provider.verifyWebhookSignature(headers, body)).toBe(false)
    })

    it('rejects requests outside the tolerance window', () => {
      const provider = createProvider({ signingSecret: SIGNING_SECRET })
      const body = '{}'
      const ts = 1700000000 - 600 // 10 minutes ago

      const headers = {
        'x-slack-signature': signRequest(SIGNING_SECRET, body, ts),
        'x-slack-request-timestamp': String(ts),
      }

      expect(provider.verifyWebhookSignature(headers, body)).toBe(false)
    })

    it('returns false when no signing secret is configured', () => {
      const provider = createProvider({})
      const headers = {
        'x-slack-signature': 'v0=anything',
        'x-slack-request-timestamp': '1700000000',
      }
      expect(provider.verifyWebhookSignature(headers, '{}')).toBe(false)
    })

    it('returns false when required headers are missing', () => {
      const provider = createProvider({ signingSecret: SIGNING_SECRET })
      expect(provider.verifyWebhookSignature({}, '{}')).toBe(false)
    })
  })

  describe('parseInbound', () => {
    it('normalises a message.channels event_callback', () => {
      const provider = createProvider({ signingSecret: SIGNING_SECRET })
      const payload = {
        type: 'event_callback',
        event: {
          type: 'message',
          channel: 'C123',
          user: 'U456',
          text: 'hello world',
          ts: '1700000000.000100',
        },
      }

      const inbound = provider.parseInbound(payload)

      expect(inbound.from).toBe('U456')
      expect(inbound.channel).toBe('slack')
      expect(inbound.text).toBe('hello world')
      expect(inbound.payload).toBe(payload)
      expect(inbound.receivedAt).toBeInstanceOf(Date)
    })

    it('normalises an app_mention event_callback with thread context', () => {
      const provider = createProvider({ signingSecret: SIGNING_SECRET })
      const payload = {
        type: 'event_callback',
        event: {
          type: 'app_mention',
          channel: 'C123',
          user: 'U999',
          text: '<@UBOT> help',
          thread_ts: '1699999000.000001',
          ts: '1700000000.000100',
        },
      }

      const inbound = provider.parseInbound(payload)

      expect(inbound.from).toBe('U999')
      expect(inbound.thread_id).toBe('1699999000.000001')
      expect(inbound.text).toBe('<@UBOT> help')
    })

    it('parses a slash command from a URL-encoded form body string', () => {
      const provider = createProvider({ signingSecret: SIGNING_SECRET })
      const body =
        'token=abc&team_id=T1&channel_id=C1&user_id=U2&command=%2Fhelp&text=topics+billing'

      const inbound = provider.parseInbound(body)

      expect(inbound.from).toBe('U2')
      expect(inbound.channel).toBe('slack')
      expect(inbound.text).toBe('/help topics billing')
    })

    it('parses a slash command from a pre-parsed object payload', () => {
      const provider = createProvider({ signingSecret: SIGNING_SECRET })
      const payload = {
        command: '/deploy',
        user_id: 'U7',
        text: 'staging',
        channel_id: 'C99',
      }

      const inbound = provider.parseInbound(payload)

      expect(inbound.from).toBe('U7')
      expect(inbound.text).toBe('/deploy staging')
    })

    it('throws on an unrecognised payload shape', () => {
      const provider = createProvider({ signingSecret: SIGNING_SECRET })
      expect(() => provider.parseInbound({ unrelated: 'thing' })).toThrowError(
        /unrecognised payload shape/,
      )
    })

    it('throws when payload is not an object or string', () => {
      const provider = createProvider({ signingSecret: SIGNING_SECRET })
      expect(() => provider.parseInbound(null)).toThrowError(/not an object/)
      expect(() => provider.parseInbound(42 as unknown)).toThrowError(/not an object/)
    })
  })
})
