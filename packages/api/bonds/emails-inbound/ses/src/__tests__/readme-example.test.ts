/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: a real Express app receives a
 * genuinely RSA-signed SNS notification over HTTP, and the reply goes out
 * through the real `@molecule/api-emails-ses` bond. The outside world is
 * faked at the network edge only: the SNS signing-cert URL and subscribe URL
 * (`fetch`), and a local HTTP stand-in for the SESv2 API (`AWS_SES_ENDPOINT`).
 *
 * @module
 */
import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { createSign } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import express from 'express'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setTransport } from '@molecule/api-emails'
import {
  parseWebhookPayload,
  replyTo,
  setProvider,
  verifySignature,
} from '@molecule/api-emails-inbound'
import { provider as sesTransport } from '@molecule/api-emails-ses'

import { provider as sesInbound } from '../index.js'

const TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:ses-inbound'
const CERT_URL = 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-readme.pem'
const SUBSCRIBE_URL = 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&Token=t'

/**
 * Generates a self-signed RSA certificate the way the package's unit suite does.
 *
 * @returns The PEM certificate and private key.
 */
const buildCert = (): { certPem: string; keyPem: string } => {
  const dir = mkdtempSync(join(tmpdir(), 'ses-readme-cert-'))
  try {
    const keyPath = join(dir, 'key.pem')
    const certPath = join(dir, 'cert.pem')
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-keyout',
        keyPath,
        '-out',
        certPath,
      ].concat(['-days', '30', '-subj', '/CN=readme-sns-signer']),
      { stdio: 'pipe' },
    )
    return { certPem: readFileSync(certPath, 'utf8'), keyPem: readFileSync(keyPath, 'utf8') }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const { certPem, keyPem } = buildCert()

/**
 * Builds an SNS delivery signed exactly as SNS signs it (SignatureVersion 1).
 *
 * @param fields - The SNS fields (Type, Message, …).
 * @returns The JSON body.
 */
const snsBody = (fields: Record<string, string>): string => {
  const payload: Record<string, string> = {
    MessageId: 'sns-1',
    Timestamp: '2026-09-24T10:00:00.000Z',
    TopicArn: TOPIC_ARN,
    ...fields,
  }
  const keys =
    payload.Type === 'SubscriptionConfirmation'
      ? ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type']
      : ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type']
  const canonical = keys
    .filter((k) => payload[k] !== undefined)
    .map((k) => `${k}\n${payload[k]}\n`)
    .join('')
  const Signature = createSign('RSA-SHA1').update(canonical, 'utf8').sign(keyPem, 'base64')
  return JSON.stringify({ ...payload, SignatureVersion: '1', Signature, SigningCertURL: CERT_URL })
}

const rawMime = [
  'From: Alice <alice@example.com>',
  'To: support@desk.example.com',
  'Subject: Order question',
  'Message-ID: <orig-1@mail.example.com>',
  'Date: Thu, 24 Sep 2026 10:00:00 +0000',
  'MIME-Version: 1.0',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Where is my order?',
  '',
].join('\r\n')

describe('README @example', () => {
  const originalEnv = process.env
  const realFetch = globalThis.fetch
  const sesRequests: Array<{ url: string; body: Record<string, unknown> }> = []
  let sesApi: Server

  beforeAll(async () => {
    sesApi = createServer((req, res) => {
      let data = ''
      req.on('data', (chunk: Buffer) => (data += chunk.toString()))
      req.on('end', () => {
        sesRequests.push({ url: req.url ?? '', body: JSON.parse(data) as Record<string, unknown> })
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ MessageId: 'ses-reply-1' }))
      })
    })
    await new Promise<void>((resolve) => sesApi.listen(0, '127.0.0.1', () => resolve()))
    const { port } = sesApi.address() as AddressInfo
    process.env = {
      ...originalEnv,
      AWS_SES_INBOUND_TOPIC_ARN: TOPIC_ARN,
      AWS_SES_REGION: 'us-east-1',
      AWS_SES_ENDPOINT: `http://127.0.0.1:${port}`,
      AWS_ACCESS_KEY_ID: 'AKIAREADMEEXAMPLE',
      AWS_SECRET_ACCESS_KEY: 'readme-example-secret',
      NO_PROXY: '127.0.0.1,localhost',
      no_proxy: '127.0.0.1,localhost',
    }
  })

  afterAll(async () => {
    process.env = originalEnv
    await new Promise<void>((resolve) => sesApi.close(() => resolve()))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('confirms the subscription, then verifies, parses and replies to inbound mail', async () => {
    const subscribed = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === CERT_URL) return new Response(certPem, { status: 200 })
      if (url === SUBSCRIBE_URL) {
        subscribed()
        return new Response('<ConfirmSubscriptionResponse/>', { status: 200 })
      }
      return realFetch(input, init)
    })
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(sesInbound)
    setTransport(sesTransport)

    const app = express()
    app.post('/webhooks/ses-inbound', express.raw({ type: () => true }), async (req, res) => {
      if (!(await verifySignature(req.headers, req.body))) {
        res.status(401).end()
        return
      }
      const email = await parseWebhookPayload(req.headers, req.body)

      if (email.subject === '__sns:SubscriptionConfirmation') {
        const subscribeUrl = email.headers['x-sns-subscribe-url']
        if (typeof subscribeUrl === 'string') await fetch(subscribeUrl)
        res.status(200).end()
        return
      }

      console.log(email.id, email.from, email.subject, email.textBody)
      await replyTo(email, {
        from: 'support@desk.example.com',
        textBody: `Thanks, we received "${email.subject}".`,
      })
      res.status(200).end()
    })

    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', () => resolve()))
    const { port } = server.address() as AddressInfo
    const post = (body: string): Promise<Response> =>
      realFetch(`http://127.0.0.1:${port}/webhooks/ses-inbound`, {
        method: 'POST',
        headers: { 'content-type': 'text/plain; charset=UTF-8' },
        body,
      })

    try {
      const confirm = await post(
        snsBody({
          Type: 'SubscriptionConfirmation',
          Message: 'You have chosen to subscribe to the topic.',
          SubscribeURL: SUBSCRIBE_URL,
          Token: 't',
        }),
      )
      expect(confirm.status).toBe(200)
      expect(subscribed).toHaveBeenCalledTimes(1)

      const notification = snsBody({
        Type: 'Notification',
        Subject: 'Amazon SES Email Receipt Notification',
        Message: JSON.stringify({
          notificationType: 'Received',
          mail: {
            timestamp: '2026-09-24T10:00:00.000Z',
            messageId: 'ses-msg-1',
            source: 'alice@example.com',
            destination: ['support@desk.example.com'],
          },
          content: Buffer.from(rawMime).toString('base64'),
        }),
      })
      const delivered = await post(notification)
      expect(delivered.status).toBe(200)
      expect(log).toHaveBeenCalledWith(
        'ses-msg-1',
        expect.stringContaining('alice@example.com'),
        'Order question',
        expect.stringContaining('Where is my order?'),
      )

      expect(sesRequests).toHaveLength(1)
      expect(sesRequests[0]?.url).toBe('/v2/email/outbound-emails')
      const content = sesRequests[0]?.body.Content as { Raw: { Data: string } }
      const sentMime = Buffer.from(content.Raw.Data, 'base64').toString('utf8')
      expect(sentMime).toContain('Subject: Re: Order question')
      expect(sentMime).toContain('In-Reply-To: <orig-1@mail.example.com>')
      expect(sentMime).toContain('Thanks, we received "Order question".')

      const tampered = notification.replace('ses-msg-1', 'ses-msg-forged')
      expect((await post(tampered)).status).toBe(401)
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
