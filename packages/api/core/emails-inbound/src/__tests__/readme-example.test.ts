/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: a real Express app receives correctly
 * signed Mailgun Routes POSTs over HTTP, files one ticket per email (retries
 * deduped) and replies through the real `@molecule/api-emails-mailgun` bond.
 * Only Mailgun's HTTP client (`nodemailer-mailgun-transport`) is mocked.
 *
 * @module
 */
import { createHmac } from 'node:crypto'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setTransport } from '@molecule/api-emails'
import { provider as mailgunRoutes } from '@molecule/api-emails-inbound-mailgun'
import { provider as mailgunTransport } from '@molecule/api-emails-mailgun'

import {
  parseWebhookPayload,
  replyTo,
  setProvider,
  supportsReply,
  verifySignature,
} from '../index.js'

const { sentMail } = vi.hoisted(() => ({ sentMail: vi.fn() }))

vi.mock('nodemailer-mailgun-transport', () => ({
  default: vi.fn(() => ({
    name: 'mailgun-test',
    version: '1.0.0',
    send(
      mail: { data: Record<string, unknown> },
      callback: (error: Error | null, info: Record<string, unknown>) => void,
    ): void {
      sentMail(mail.data)
      callback(null, { messageId: '<reply-1@mg.example.com>', message: 'Queued. Thank you.' })
    },
  })),
}))

const API_KEY = 'key-readme-example'

const signedForm = (fields: Record<string, string>): string => {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const token = 'tok-readme-1'
  const signature = createHmac('sha256', API_KEY)
    .update(timestamp + token)
    .digest('hex')
  return new URLSearchParams({ timestamp, token, signature, ...fields }).toString()
}

describe('README @example', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, MAILGUN_API_KEY: API_KEY, MAILGUN_DOMAIN: 'mg.example.com' }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('verifies, files one ticket per email (retries deduped), replies, and rejects forgeries', async () => {
    setProvider(mailgunRoutes)
    setTransport(mailgunTransport)

    const tickets = new Map<string, { from: string; subject: string; body: string }>()

    const app = express()
    app.post('/webhooks/inbound-email', express.raw({ type: () => true }), async (req, res) => {
      if (!(await verifySignature(req.headers, req.body))) {
        res.status(401).end()
        return
      }
      const email = await parseWebhookPayload(req.headers, req.body)

      if (!tickets.has(email.id)) {
        tickets.set(email.id, {
          from: email.from,
          subject: email.subject,
          body: email.textBody ?? '',
        })
        if (supportsReply()) {
          await replyTo(email, {
            from: `support@${process.env.MAILGUN_DOMAIN}`,
            textBody: `Thanks, we opened a ticket for "${email.subject}".`,
          })
        }
      }
      res.status(200).end()
    })

    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    const { port } = server.address() as AddressInfo
    const post = (body: string): Promise<Response> =>
      fetch(`http://127.0.0.1:${port}/webhooks/inbound-email`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
      })

    try {
      const body = signedForm({
        From: 'alice@example.com',
        To: 'support@mg.example.com',
        subject: 'Order question',
        'body-plain': 'Where is my order?',
        'Message-Id': '<msg-1@example.com>',
      })
      expect((await post(body)).status).toBe(200)
      expect((await post(body)).status).toBe(200) // provider retry

      expect([...tickets.values()]).toEqual([
        { from: 'alice@example.com', subject: 'Order question', body: 'Where is my order?' },
      ])
      expect(sentMail).toHaveBeenCalledTimes(1)
      expect(sentMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'support@mg.example.com',
          to: 'alice@example.com',
          subject: 'Re: Order question',
          text: 'Thanks, we opened a ticket for "Order question".',
        }),
      )

      const forged = await post(body.replace(/signature=[0-9a-f]+/, 'signature=deadbeef'))
      expect(forged.status).toBe(401)
      expect(tickets.size).toBe(1)
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
