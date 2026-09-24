/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the Slack Web API SDK client is
 * mocked; webhook signatures are real `v0` HMAC-SHA256 signatures.
 *
 * @module
 */
import { createHmac } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProviderByName, setProvider } from '@molecule/api-channel'

import { createProvider } from '../index.js'

const { postMessage } = vi.hoisted(() => ({
  postMessage: vi.fn(async () => ({ ok: true, ts: '1714000000.000100', channel: 'C0123ABCD' })),
}))

vi.mock('@slack/web-api', () => ({
  WebClient: class {
    chat = { postMessage }
  },
}))

describe('README @example', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('posts, replies in thread and handles signed Events API deliveries', async () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-test'
    process.env.SLACK_SIGNING_SECRET = 'signing-secret'
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(
      'slack',
      createProvider({
        botToken: process.env.SLACK_BOT_TOKEN,
        signingSecret: process.env.SLACK_SIGNING_SECRET,
      }),
    )
    const slack = requireProviderByName('slack')

    const sent = await slack.sendMessage('C0123ABCD', { kind: 'text', text: 'Deploy finished ✅' })
    await slack.sendMessage('C0123ABCD', {
      kind: 'text',
      text: '12 files changed',
      thread_id: sent.messageId,
    })

    expect(sent).toEqual({
      messageId: '1714000000.000100',
      deliveredAt: new Date(1714000000000.1),
    })
    expect(postMessage).toHaveBeenNthCalledWith(1, {
      channel: 'C0123ABCD',
      text: 'Deploy finished ✅',
    })
    expect(postMessage).toHaveBeenNthCalledWith(2, {
      channel: 'C0123ABCD',
      text: '12 files changed',
      thread_ts: '1714000000.000100',
    })

    function handleSlackEvent(
      headers: Record<string, string>,
      rawBody: string,
    ): { status: number; body: string | undefined } {
      if (!slack.verifyWebhookSignature(headers, rawBody)) return { status: 401, body: '' }
      const payload = JSON.parse(rawBody) as { type: string; challenge?: string }
      if (payload.type === 'url_verification') return { status: 200, body: payload.challenge }
      const inbound = slack.parseInbound(payload)
      console.log(`${inbound.from} said ${inbound.text}`)
      return { status: 200, body: '' }
    }

    const signed = (rawBody: string): Record<string, string> => {
      const timestamp = String(Math.floor(Date.now() / 1000))
      const digest = createHmac('sha256', 'signing-secret')
        .update(`v0:${timestamp}:${rawBody}`)
        .digest('hex')
      return { 'X-Slack-Request-Timestamp': timestamp, 'X-Slack-Signature': `v0=${digest}` }
    }

    const challenge = JSON.stringify({ type: 'url_verification', challenge: 'abc123' })
    expect(handleSlackEvent(signed(challenge), challenge)).toEqual({ status: 200, body: 'abc123' })

    const mention = JSON.stringify({
      type: 'event_callback',
      event: { type: 'app_mention', user: 'U123', text: 'hi bot', channel: 'C0123ABCD', ts: '1.2' },
    })
    expect(handleSlackEvent(signed(mention), mention)).toEqual({ status: 200, body: '' })
    expect(log).toHaveBeenCalledWith('U123 said hi bot')

    expect(handleSlackEvent({ 'X-Slack-Signature': 'v0=bad' }, mention).status).toBe(401)
  })
})
