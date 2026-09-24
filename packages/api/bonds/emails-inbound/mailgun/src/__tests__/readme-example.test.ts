/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: a real Express app receives a
 * correctly signed Mailgun Routes POST over HTTP and replies through the real
 * `@molecule/api-emails-mailgun` bond. Only nodemailer's network transport is
 * mocked.
 *
 * @module
 */
import { createHmac } from 'node:crypto'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setTransport } from '@molecule/api-emails'
import {
  parseWebhookPayload,
  replyTo,
  setProvider,
  verifySignature,
} from '@molecule/api-emails-inbound'
import { provider as mailgunTransport } from '@molecule/api-emails-mailgun'

import { provider as mailgunRoutes } from '../index.js'

const { sentMail } = vi.hoisted(() => ({ sentMail: vi.fn() }))

// The Mailgun HTTP client is the outside world: replace nodemailer-mailgun-transport with a
// nodemailer custom transport that records the composed message instead of calling Mailgun.
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

  it('verifies, parses and replies (threaded) to a signed Routes POST', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(mailgunRoutes)
    setTransport(mailgunTransport)

    const app = express()
    app.post(
      '/webhooks/mailgun',
      express.raw({ type: 'application/x-www-form-urlencoded' }),
      async (req, res) => {
        if (!(await verifySignature(req.headers, req.body))) {
          res.status(401).end()
          return
        }
        const email = await parseWebhookPayload(req.headers, req.body)
        console.log(email.id, email.from, email.subject, email.textBody)

        await replyTo(email, {
          from: `support@${process.env.MAILGUN_DOMAIN}`,
          textBody: `Thanks, we received "${email.subject}".`,
        })
        res.status(200).end()
      },
    )

    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    const { port } = server.address() as AddressInfo
    const url = `http://127.0.0.1:${port}/webhooks/mailgun`
    const post = (body: string): Promise<Response> =>
      fetch(url, {
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
      const ok = await post(body)
      expect(ok.status).toBe(200)
      expect(log).toHaveBeenCalledWith(
        'msg-1@example.com',
        'alice@example.com',
        'Order question',
        'Where is my order?',
      )
      expect(sentMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'support@mg.example.com',
          to: 'alice@example.com',
          subject: 'Re: Order question',
          text: 'Thanks, we received "Order question".',
          headers: { 'In-Reply-To': '<msg-1@example.com>', References: '<msg-1@example.com>' },
        }),
      )

      const forged = await post(body.replace(/signature=[0-9a-f]+/, 'signature=deadbeef'))
      expect(forged.status).toBe(401)
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
