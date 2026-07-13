/**
 * REAL-DEPENDENCY integration tests — no mocks anywhere: real `node:crypto`
 * HMAC signing (exactly what Mailgun computes), and the REAL
 * `@molecule/api-emails` core delegation for the reply path (the unit suite
 * mocks `sendMail`, so it never proves the compose-onto-the-outbound-bond
 * wiring actually works).
 *
 * Exercises the whole webhook lifecycle the way a helpdesk app experiences
 * it: signed POST → verify → parse → reply-with-threading, plus the
 * consumer-experience property that the default replay window absorbs
 * slow-but-legitimate deliveries (retries, clock skew) and the distinct
 * failure modes a caller must be able to tell apart.
 *
 * @module
 */

import { Buffer } from 'node:buffer'
import { createHmac } from 'node:crypto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'
import { setTransport } from '@molecule/api-emails'

import { parseWebhookPayload, replyTo, supportsReply, verifySignature } from '../provider.js'
import { DEFAULT_REPLAY_WINDOW_SECONDS } from '../utilities.js'

const TEST_API_KEY = 'key-integration-1234567890'

/**
 * Builds a Mailgun-Routes-style form-encoded webhook body, signed the way
 * Mailgun signs it: `HMAC-SHA256(key=api_key, msg=timestamp + token)`.
 *
 * @param fields - Additional form fields (From, To, subject, body-plain, ...).
 * @param timestampOffsetSeconds - Offset applied to "now" for the signing timestamp.
 * @returns The raw form-encoded body string.
 */
const buildSignedBody = (fields: Record<string, string>, timestampOffsetSeconds = 0): string => {
  const timestamp = String(Math.floor(Date.now() / 1000) + timestampOffsetSeconds)
  const token = `tok-${timestamp}-${Math.random().toString(36).slice(2, 10)}`
  const signature = createHmac('sha256', TEST_API_KEY)
    .update(timestamp + token)
    .digest('hex')
  return new URLSearchParams({ timestamp, token, signature, ...fields }).toString()
}

describe('@molecule/api-emails-inbound-mailgun × REAL crypto + REAL api-emails', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.MAILGUN_API_KEY = TEST_API_KEY
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // NOTE: this test runs BEFORE any outbound transport is bonded — order is
  // load-bearing (the bond registry is process-global).
  it('FAILURE DISAMBIGUATION: replying without an outbound transport names the missing wiring, not a generic failure', async () => {
    const email = await parseWebhookPayload(
      {},
      buildSignedBody({ From: 'alice@example.com', To: 'support@desk.example', subject: 'Help' }),
    )

    // Missing outbound bond → actionable config error from the emails core...
    await expect(replyTo(email, { textBody: 'hi' })).rejects.toThrow(
      /Email transport not configured\. Call setTransport\(\) first\./u,
    )

    // ...which is distinct from a malformed reply (no usable From address).
    await expect(replyTo({ ...email, to: [] }, { textBody: 'hi' })).rejects.toThrow(
      /no `from` address/u,
    )
  })

  it('CONSUMER PROPERTY: the default replay window absorbs slow deliveries and clock skew, but not hour-old replays', async () => {
    expect(DEFAULT_REPLAY_WINDOW_SECONDS).toBe(300)

    // A webhook that took 4 minutes to reach us (Mailgun retry backoff, slow
    // proxy) is legitimate and MUST verify — a tighter window would make
    // email-to-ticket silently drop retried mail.
    const slow = buildSignedBody({ subject: 'slow delivery' }, -240)
    expect(await verifySignature({}, slow)).toBe(true)

    // Server clock 4 minutes BEHIND Mailgun (future timestamp) must also pass.
    const skewed = buildSignedBody({ subject: 'clock skew' }, 240)
    expect(await verifySignature({}, skewed)).toBe(true)

    // An hour-old replay is rejected.
    const stale = buildSignedBody({ subject: 'replay' }, -3600)
    expect(await verifySignature({}, stale)).toBe(false)
  })

  it('rejects a tampered signature (false, not a throw)', async () => {
    const body = buildSignedBody({ subject: 'tamper me' })
    const tampered = body.replace(/signature=[0-9a-f]{8}/u, 'signature=00000000')
    expect(await verifySignature({}, tampered)).toBe(false)
  })

  it('FAILURE DISAMBIGUATION: an unconfigured MAILGUN_API_KEY throws a tagged 503, distinct from a `false` (401) forged/stale/malformed webhook', async () => {
    // A well-signed, fresh, complete webhook still verifies `false` for
    // tampering/staleness/missing fields (401 — "this is not from
    // Mailgun") — see the other tests in this file. An unconfigured key is
    // a DIFFERENT failure class: the server itself is broken, not the
    // request. It must throw (not resolve `false`) so the caller's error
    // middleware can 503 with the actionable "MAILGUN_API_KEY is not set"
    // message instead of collapsing into the same silent 401 as forgery.
    delete process.env.MAILGUN_API_KEY
    const wellSigned = buildSignedBody({ subject: 'no key configured' })

    await expect(verifySignature({}, wellSigned)).rejects.toMatchObject({
      statusCode: 503,
      errorKey: 'config.notConfigured',
    })
    await expect(verifySignature({}, wellSigned)).rejects.toThrow(/MAILGUN_API_KEY/u)
  })

  it('full lifecycle: signed webhook → verify → parse → threaded reply through the REAL outbound bond', async () => {
    const attachment = JSON.stringify({
      name: 'invoice.pdf',
      'content-type': 'application/pdf',
      size: 5,
      content: Buffer.from('%PDF-').toString('base64'),
    })
    const body = buildSignedBody({
      From: 'Alice <alice@example.com>',
      To: 'support@desk.example, ops@desk.example',
      subject: 'Printer on fire',
      'body-plain': 'It is REALLY on fire.',
      'body-html': '<p>It is <b>REALLY</b> on fire.</p>',
      'Message-Id': '<orig-1@mail.example.com>',
      References: '<prev-0@mail.example.com>',
      'message-headers': JSON.stringify([['X-Mailgun-Sflag', 'No']]),
      'attachment-count': '1',
      'attachment-1': attachment,
    })

    // 1. The webhook endpoint verifies the (Buffer) body...
    expect(await verifySignature({}, Buffer.from(body, 'utf8'))).toBe(true)

    // 2. ...parses it into the normalized shape...
    const email = await parseWebhookPayload({}, body)
    expect(email.from).toBe('Alice <alice@example.com>')
    expect(email.to).toEqual(['support@desk.example', 'ops@desk.example'])
    expect(email.subject).toBe('Printer on fire')
    expect(email.textBody).toBe('It is REALLY on fire.')
    expect(email.messageId).toBe('orig-1@mail.example.com')
    expect(email.references).toEqual(['prev-0@mail.example.com'])
    expect(email.attachments).toHaveLength(1)
    expect(email.headers['x-mailgun-sflag']).toBe('No')

    // 3. ...and replies through the REAL @molecule/api-emails delegation.
    const delivered: EmailMessage[] = []
    const memoryTransport: EmailTransport = {
      async sendMail(msg: EmailMessage): Promise<EmailSendResult> {
        delivered.push(msg)
        return { accepted: ['alice@example.com'], rejected: [], messageId: '<reply-1@desk>' }
      },
    }
    setTransport(memoryTransport)

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
    expect(result.id).toBe('<reply-1@desk>')

    expect(delivered).toHaveLength(1)
    const sent = delivered[0]! as EmailMessage & { headers: Record<string, string> }
    expect(sent.from).toBe('support@desk.example') // the inbound mailbox
    expect(sent.to).toBe('Alice <alice@example.com>') // back to the sender (full RFC 5322 mailbox)
    expect(sent.subject).toBe('Re: Printer on fire')
    // Threading headers keep the reply in the recipient's existing thread.
    expect(sent.headers['In-Reply-To']).toBe('<orig-1@mail.example.com>')
    expect(sent.headers.References).toBe('<prev-0@mail.example.com> <orig-1@mail.example.com>')
    // Attachment bytes round-trip base64 → Buffer.
    const sentAttachment = (sent.attachments ?? [])[0]!
    expect(sentAttachment.filename).toBe('guide.txt')
    expect((sentAttachment.content as Buffer).toString('utf8')).toBe('aim low')
  })

  it('CONSUMER PROPERTY: an id-less message keeps the SAME fallback `id` across a Mailgun retry, so dedupe holds', async () => {
    // Mailgun regenerates `timestamp`/`token`/`signature` on every delivery
    // attempt of the SAME message — the old `fields.token` fallback made
    // every retry look like a brand-new message. The fallback id must
    // instead derive from data that does NOT change across retries (sender,
    // the mail's own `Date` header, subject).
    const sharedFields = {
      From: 'alice@example.com',
      To: 'support@desk.example',
      subject: 'No Message-Id here',
      'message-headers': JSON.stringify([['Date', 'Mon, 01 Jan 2024 00:00:00 +0000']]),
    }

    const firstAttempt = buildSignedBody(sharedFields, 0)
    const retryAttempt = buildSignedBody(sharedFields, -120) // same message, later retry

    const first = await parseWebhookPayload({}, firstAttempt)
    const retry = await parseWebhookPayload({}, retryAttempt)

    expect(first.id).not.toBe('') // a real id was derived, not left empty
    expect(first.id).toBe(retry.id) // retries of the SAME message dedupe

    // A genuinely different message (different Date header) gets a
    // different fallback id.
    const different = await parseWebhookPayload(
      {},
      buildSignedBody({
        ...sharedFields,
        'message-headers': JSON.stringify([['Date', 'Tue, 02 Jan 2024 00:00:00 +0000']]),
      }),
    )
    expect(different.id).not.toBe(first.id)
  })
})
