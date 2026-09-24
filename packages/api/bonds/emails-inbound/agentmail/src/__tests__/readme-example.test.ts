/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: a real Express app receives a
 * correctly Svix-signed webhook over HTTP. Only AgentMail's REST API (the
 * outbound `fetch` to `api.agentmail.to`) is stubbed.
 *
 * @module
 */
import { createHmac, randomBytes } from 'node:crypto'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  parseWebhookPayload,
  replyTo,
  setProvider,
  verifySignature,
} from '@molecule/api-emails-inbound'

import { provider as agentMailInbound } from '../index.js'

const ENV_KEYS = ['AGENTMAIL_WEBHOOK_SECRET', 'AGENTMAIL_API_KEY', 'AGENTMAIL_INBOX_ID'] as const
const key = randomBytes(24)

const sign = (id: string, timestamp: string, body: string): string =>
  `v1,${createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')}`

describe('README @example', () => {
  const saved: Record<string, string | undefined> = {}
  const realFetch = globalThis.fetch

  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k]
    process.env.AGENTMAIL_WEBHOOK_SECRET = `whsec_${key.toString('base64')}`
    process.env.AGENTMAIL_API_KEY = 'am_test_key'
    process.env.AGENTMAIL_INBOX_ID = 'inbox_123'
  })

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
    vi.restoreAllMocks()
  })

  it('verifies, parses and replies to a signed message.received webhook', async () => {
    const agentMailCalls: Array<{ url: string; body: unknown }> = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (!url.startsWith('https://api.agentmail.to/')) return realFetch(input, init)
      agentMailCalls.push({ url, body: JSON.parse(String(init?.body)) })
      return Response.json({ message_id: '<reply-1@agentmail.to>', thread_id: 'thr_1' })
    })
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(agentMailInbound)

    const app = express()
    app.post('/webhooks/agentmail', express.raw({ type: 'application/json' }), async (req, res) => {
      if (!(await verifySignature(req.headers, req.body))) {
        res.status(401).end()
        return
      }
      const email = await parseWebhookPayload(req.headers, req.body)
      console.log(email.id, email.from, email.subject, email.textBody)

      await replyTo(email, { textBody: `Thanks, we received "${email.subject}".` })
      res.status(204).end()
    })

    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    const { port } = server.address() as AddressInfo
    const url = `http://127.0.0.1:${port}/webhooks/agentmail`

    try {
      const body = JSON.stringify({
        type: 'event',
        event_type: 'message.received',
        event_id: 'evt_1',
        message: {
          inbox_id: 'inbox_123',
          message_id: '<msg-1@example.com>',
          from: 'Alice <alice@example.com>',
          to: ['support@agentmail.to'],
          subject: 'Order question',
          text: 'Where is my order?',
          timestamp: '2026-09-24T10:00:00.000Z',
        },
      })
      const ts = String(Math.floor(Date.now() / 1000))

      const ok = await realFetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'svix-id': 'msg_1',
          'svix-timestamp': ts,
          'svix-signature': sign('msg_1', ts, body),
        },
        body,
      })
      expect(ok.status).toBe(204)
      expect(log).toHaveBeenCalledWith(
        '<msg-1@example.com>',
        'Alice <alice@example.com>',
        'Order question',
        'Where is my order?',
      )
      expect(agentMailCalls).toEqual([
        {
          url: 'https://api.agentmail.to/v0/inboxes/inbox_123/messages/%3Cmsg-1%40example.com%3E/reply',
          body: { to: 'Alice <alice@example.com>', text: 'Thanks, we received "Order question".' },
        },
      ])

      const forged = await realFetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'svix-id': 'msg_2',
          'svix-timestamp': ts,
          'svix-signature': 'v1,Zm9yZ2Vk',
        },
        body,
      })
      expect(forged.status).toBe(401)
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
