/**
 * REAL-DEPENDENCY integration tests — no module mocks anywhere: real
 * `node:crypto` HMAC signing (exactly what Svix computes for AgentMail),
 * the real `@molecule/api-secrets` tagged config errors, and the real
 * provider composition. The only stub is `fetch` at the network edge, and
 * it plays AgentMail's API faithfully (documented paths, envelopes and the
 * two-step attachment download).
 *
 * Exercises the whole webhook lifecycle the way a helpdesk/agent app
 * experiences it: signed POST → verify → parse (with hydration) → reply,
 * plus the consumer-experience properties — the default replay window
 * absorbs slow-but-legitimate deliveries, Svix redeliveries dedupe, and
 * the distinct failure modes a caller must be able to tell apart.
 *
 * @module
 */

import { Buffer } from 'node:buffer'
import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AgentMailApiError } from '../api.js'
import {
  _resetInboxMemo,
  parseWebhookPayload,
  replyTo,
  supportsReply,
  verifySignature,
} from '../provider.js'
import { DEFAULT_REPLAY_WINDOW_SECONDS } from '../utilities.js'

const SECRET_BYTES = Buffer.from('integration-secret-bytes-0123456789ab')
const TEST_SECRET = `whsec_${SECRET_BYTES.toString('base64')}`
const TEST_API_KEY = 'am_integration_key'
const INBOX_ID = 'inbox_integration'
const MESSAGE_ID = '<orig-1@mail.example.com>'
const MESSAGE_PATH = `/v0/inboxes/${INBOX_ID}/messages/${encodeURIComponent(MESSAGE_ID)}`

/**
 * Signs a webhook body the way Svix signs AgentMail's deliveries:
 * `HMAC-SHA256(key=base64decode(secret sans whsec_), msg=id.timestamp.body)`.
 *
 * @param body - The raw JSON body.
 * @param timestampOffsetSeconds - Offset applied to "now" for the signing timestamp.
 * @param id - The delivery id (`svix-id`); a redelivery keeps the same id.
 * @returns The three signing headers.
 */
const signedHeaders = (
  body: string,
  timestampOffsetSeconds = 0,
  id = `msg_${Math.random().toString(36).slice(2, 12)}`,
): Record<string, string> => {
  const timestamp = String(Math.floor(Date.now() / 1000) + timestampOffsetSeconds)
  const signature = createHmac('sha256', SECRET_BYTES)
    .update(`${id}.${timestamp}.${body}`)
    .digest('base64')
  return { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}` }
}

const webhookBody = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    type: 'event',
    event_type: 'message.received',
    event_id: 'evt_integration',
    message: {
      inbox_id: INBOX_ID,
      thread_id: 'thd_1',
      message_id: MESSAGE_ID,
      labels: ['received'],
      timestamp: '2026-09-01T10:00:00Z',
      from: 'Alice <alice@example.com>',
      to: ['support@desk.agentmail.to', 'ops@desk.agentmail.to'],
      subject: 'Printer on fire',
      text: 'It is REALLY on fire.',
      html: '<p>It is <b>REALLY</b> on fire.</p>',
      attachments: [
        {
          attachment_id: 'att_inv',
          size: 5,
          filename: 'invoice.pdf',
          content_type: 'application/pdf',
        },
      ],
      references: ['<prev-0@mail.example.com>'],
      headers: { 'X-AgentMail-Flag': 'No' },
      size: 4321,
      created_at: '2026-09-01T10:00:00Z',
      updated_at: '2026-09-01T10:00:01Z',
      ...overrides,
    },
  })

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** A faithful stand-in for AgentMail's API at the network edge. */
const fakeAgentMail = (
  replies: Array<Record<string, unknown>>,
): ReturnType<typeof vi.fn<typeof fetch>> =>
  vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input)
    const auth = new Headers(init?.headers).get('authorization')

    if (url.startsWith('https://files.example/')) {
      // Presigned download: must NOT carry the API key.
      if (auth !== null) return new Response('Only one auth mechanism allowed', { status: 400 })
      return new Response(Buffer.from('%PDF-'), { status: 200 })
    }

    if (auth !== `Bearer ${TEST_API_KEY}`) {
      return json(
        { name: 'UnauthorizedError', code: 'missing_authorization', message: 'No key.' },
        401,
      )
    }
    if (url === `https://api.agentmail.to${MESSAGE_PATH}/attachments/att_inv`) {
      return json({
        attachment_id: 'att_inv',
        size: 5,
        download_url: 'https://files.example/att_inv',
      })
    }
    if (url === `https://api.agentmail.to${MESSAGE_PATH}/reply` && init?.method === 'POST') {
      replies.push(JSON.parse(String(init.body)) as Record<string, unknown>)
      return json({ message_id: '<reply-1@desk.agentmail.to>', thread_id: 'thd_1' })
    }
    return json({ name: 'NotFoundError', code: 'not_found', message: `No route ${url}` }, 404)
  })

describe('@molecule/api-emails-inbound-agentmail × REAL crypto + REAL api-secrets', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.AGENTMAIL_WEBHOOK_SECRET = TEST_SECRET
    process.env.AGENTMAIL_API_KEY = TEST_API_KEY
    delete process.env.AGENTMAIL_INBOX_ID
    _resetInboxMemo()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.unstubAllGlobals()
  })

  it('CONSUMER PROPERTY: the default replay window absorbs slow deliveries and clock skew, but not hour-old replays', async () => {
    expect(DEFAULT_REPLAY_WINDOW_SECONDS).toBe(300)
    const body = webhookBody()

    // A webhook that took 4 minutes to reach us (Svix retry backoff, slow
    // proxy) is legitimate and MUST verify — a tighter window would make
    // email-to-agent silently drop retried mail.
    expect(await verifySignature(signedHeaders(body, -240), body)).toBe(true)

    // Server clock 4 minutes BEHIND Svix (future timestamp) must also pass.
    expect(await verifySignature(signedHeaders(body, 240), body)).toBe(true)

    // An hour-old replay is rejected.
    expect(await verifySignature(signedHeaders(body, -3600), body)).toBe(false)
  })

  it('rejects a tampered body or signature (false, not a throw)', async () => {
    const body = webhookBody()
    const headers = signedHeaders(body)
    expect(await verifySignature(headers, body.replace('on fire', 'fine'))).toBe(false)
    const tampered = { ...headers, 'svix-signature': `v1,${'0'.repeat(43)}=` }
    expect(await verifySignature(tampered, body)).toBe(false)
  })

  it('FAILURE DISAMBIGUATION: an unconfigured AGENTMAIL_WEBHOOK_SECRET throws a tagged 503, distinct from a `false` (401) forged/stale/malformed webhook', async () => {
    delete process.env.AGENTMAIL_WEBHOOK_SECRET
    const body = webhookBody()
    const wellSigned = signedHeaders(body)

    await expect(verifySignature(wellSigned, body)).rejects.toMatchObject({
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    await expect(verifySignature(wellSigned, body)).rejects.toThrow(/AGENTMAIL_WEBHOOK_SECRET/u)
  })

  it('FAILURE DISAMBIGUATION: replying with a wrong API key is an AgentMailApiError naming the code, distinct from an unknown inbox', async () => {
    vi.stubGlobal('fetch', fakeAgentMail([]))
    const body = webhookBody({ attachments: [] })
    const email = await parseWebhookPayload({}, body)

    process.env.AGENTMAIL_API_KEY = 'am_wrong'
    const wrongKey = replyTo(email, { textBody: 'hi' })
    await expect(wrongKey).rejects.toBeInstanceOf(AgentMailApiError)
    await expect(wrongKey).rejects.toMatchObject({ statusCode: 401, code: 'missing_authorization' })

    // ...which is distinct from "this process does not know the inbox".
    _resetInboxMemo()
    await expect(replyTo(email, { textBody: 'hi' })).rejects.toThrow(/AGENTMAIL_INBOX_ID/u)
  })

  it('full lifecycle: signed webhook → verify → parse (attachment hydrated) → reply through the REAL AgentMail path shape', async () => {
    const replies: Array<Record<string, unknown>> = []
    const fetchStub = fakeAgentMail(replies)
    vi.stubGlobal('fetch', fetchStub)

    const body = webhookBody()
    const headers = signedHeaders(body)

    // 1. The webhook endpoint verifies the (Buffer) body...
    expect(await verifySignature(headers, Buffer.from(body, 'utf8'))).toBe(true)

    // 2. ...parses it into the normalized shape, downloading the attachment...
    const email = await parseWebhookPayload(headers, body)
    expect(email.id).toBe(MESSAGE_ID)
    expect(email.messageId).toBe('orig-1@mail.example.com')
    expect(email.from).toBe('Alice <alice@example.com>')
    expect(email.to).toEqual(['support@desk.agentmail.to', 'ops@desk.agentmail.to'])
    expect(email.subject).toBe('Printer on fire')
    expect(email.textBody).toBe('It is REALLY on fire.')
    expect(email.references).toEqual(['prev-0@mail.example.com'])
    expect(email.headers['x-agentmail-flag']).toBe('No')
    expect(email.attachments).toHaveLength(1)
    expect(Buffer.from(email.attachments![0]!.contentBase64, 'base64').toString('utf8')).toBe(
      '%PDF-',
    )

    // 3. ...and replies from the receiving inbox through AgentMail's reply endpoint.
    expect(supportsReply()).toBe(true)
    const result = await replyTo(email, {
      textBody: 'Extinguisher dispatched.',
      attachments: [
        {
          name: 'guide.txt',
          contentType: 'text/plain',
          contentBase64: Buffer.from('aim low').toString('base64'),
        },
      ],
    })
    expect(result.id).toBe('<reply-1@desk.agentmail.to>')

    expect(replies).toHaveLength(1)
    const sent = replies[0]!
    expect(sent.to).toBe('Alice <alice@example.com>') // back to the sender (full RFC 5322 mailbox)
    expect(sent.text).toBe('Extinguisher dispatched.')
    expect(sent).not.toHaveProperty('subject') // AgentMail threads under the original subject itself
    const sentAttachments = sent.attachments as Array<Record<string, unknown>>
    expect(sentAttachments[0]!.filename).toBe('guide.txt')
    expect(Buffer.from(String(sentAttachments[0]!.content), 'base64').toString('utf8')).toBe(
      'aim low',
    )
  })

  it('CONSUMER PROPERTY: a Svix redelivery of the SAME message keeps the SAME `id`, so dedupe holds', async () => {
    vi.stubGlobal('fetch', fakeAgentMail([]))
    const body = webhookBody({ attachments: [] })

    // Svix re-sends the identical body under the same svix-id with a fresh
    // timestamp/signature; a slow first attempt is re-signed 2 minutes later.
    const first = signedHeaders(body, 0, 'msg_redelivered')
    const retry = signedHeaders(body, -120, 'msg_redelivered')
    expect(await verifySignature(first, body)).toBe(true)
    expect(await verifySignature(retry, body)).toBe(true)

    const a = await parseWebhookPayload(first, body)
    const b = await parseWebhookPayload(retry, body)
    expect(a.id).toBe(MESSAGE_ID)
    expect(a.id).toBe(b.id)

    // A genuinely different message gets a different id.
    const other = await parseWebhookPayload(
      {},
      webhookBody({ attachments: [], message_id: '<other@x>' }),
    )
    expect(other.id).not.toBe(a.id)
  })

  it('CONSUMER PROPERTY: with AGENTMAIL_INBOX_ID set, a reply from a later request/process still reaches the right inbox', async () => {
    const replies: Array<Record<string, unknown>> = []
    const fetchStub = fakeAgentMail(replies)
    vi.stubGlobal('fetch', fetchStub)
    process.env.AGENTMAIL_INBOX_ID = INBOX_ID

    const email = await parseWebhookPayload({}, webhookBody({ attachments: [] }))
    _resetInboxMemo() // the process that parsed it is gone

    const result = await replyTo(email, { htmlBody: '<p>Later.</p>' })
    expect(result.id).toBe('<reply-1@desk.agentmail.to>')
    expect(replies[0]!.html).toBe('<p>Later.</p>')
  })
})
