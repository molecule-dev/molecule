/**
 * REAL-DEPENDENCY integration tests — no mocks: the actual `mailparser` on a
 * realistic multipart MIME message, and the REAL `@molecule/api-emails` core
 * delegation for the reply path (the unit suite mocks `sendMail`, so it never
 * proves the compose-onto-the-outbound-bond wiring actually works).
 *
 * Signature verification with real RSA crypto is covered by
 * `provider.test.ts` (openssl-generated cert + stubbed cert endpoint); this
 * file covers the rest of the lifecycle end-to-end: SNS envelope → RFC 822
 * parse → normalized email → threaded reply, plus the distinct failure modes
 * a webhook handler must be able to tell apart.
 *
 * @module
 */

import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import type { EmailMessage, EmailSendResult, EmailTransport } from '@molecule/api-emails'
import { setTransport } from '@molecule/api-emails'

import { parseWebhookPayload, replyTo, supportsReply } from '../provider.js'

/** Raw PDF-ish attachment bytes (binary-safe round-trip check). */
const attachmentBytes = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')

/**
 * A realistic inbound message: RFC 2047-encoded UTF-8 subject, threading
 * headers, multipart/mixed with a quoted-printable text body and a base64
 * binary attachment.
 */
const rawMime = [
  'From: Alice <alice@example.com>',
  'To: support@desk.example',
  'Cc: mgr@example.com',
  `Subject: =?UTF-8?B?${Buffer.from('Beschwerde: café 🔥').toString('base64')}?=`,
  'Message-ID: <orig-1@mail.example.com>',
  'In-Reply-To: <prev-1@mail.example.com>',
  'References: <prev-0@mail.example.com> <prev-1@mail.example.com>',
  'Date: Mon, 01 Jan 2024 00:00:00 +0000',
  'MIME-Version: 1.0',
  'Content-Type: multipart/mixed; boundary="BOUNDARY"',
  '',
  '--BOUNDARY',
  'Content-Type: text/plain; charset=utf-8',
  'Content-Transfer-Encoding: quoted-printable',
  '',
  'The caf=C3=A9 espresso machine is on fire.',
  '',
  '--BOUNDARY',
  'Content-Type: application/pdf; name="invoice.pdf"',
  'Content-Disposition: attachment; filename="invoice.pdf"',
  'Content-Transfer-Encoding: base64',
  '',
  attachmentBytes.toString('base64'),
  '--BOUNDARY--',
  '',
].join('\r\n')

/**
 * Wraps an SES inbound notification in the SNS envelope the webhook receives.
 *
 * @param sesMessage - The SES notification object (mail metadata + content).
 * @returns The SNS JSON body string.
 */
const snsEnvelope = (sesMessage: Record<string, unknown>): string =>
  JSON.stringify({
    Type: 'Notification',
    MessageId: 'sns-1',
    TopicArn: 'arn:aws:sns:us-east-1:123:inbound',
    Message: JSON.stringify(sesMessage),
    Timestamp: '2024-01-01T00:00:05Z',
    SignatureVersion: '1',
    Signature: 'sig',
    SigningCertURL: 'https://sns.us-east-1.amazonaws.com/cert.pem',
  })

describe('@molecule/api-emails-inbound-ses × REAL mailparser + REAL api-emails', () => {
  // NOTE: this test runs BEFORE any outbound transport is bonded — order is
  // load-bearing (the bond registry is process-global).
  it('FAILURE DISAMBIGUATION: replying without an outbound transport names the missing wiring, not a generic failure', async () => {
    const email = await parseWebhookPayload(
      {},
      snsEnvelope({
        notificationType: 'Received',
        mail: {
          timestamp: '2024-01-01T00:00:00Z',
          source: 'alice@example.com',
          messageId: 'ses-x',
          destination: ['support@desk.example'],
        },
        content: Buffer.from(rawMime, 'utf8').toString('base64'),
      }),
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

  it('FAILURE DISAMBIGUATION: malformed bodies fail with three distinct, named causes', async () => {
    // 1. Body is not JSON at all (wrong content hit the endpoint).
    await expect(parseWebhookPayload({}, 'not json')).rejects.toThrow(/body is not valid JSON/u)

    // 2. JSON, but not an SNS envelope (endpoint wired to the wrong source).
    await expect(parseWebhookPayload({}, JSON.stringify({ hello: 'world' }))).rejects.toThrow(
      /not an SNS notification payload/u,
    )

    // 3. SNS envelope whose inner SES `Message` is broken.
    const badInner = JSON.parse(snsEnvelope({})) as Record<string, unknown>
    badInner.Message = 'not-json'
    await expect(parseWebhookPayload({}, JSON.stringify(badInner))).rejects.toThrow(
      /`Message` is not valid JSON/u,
    )
  })

  it('setup flow: a SubscriptionConfirmation surfaces the confirmation URL instead of throwing', async () => {
    const body = JSON.stringify({
      Type: 'SubscriptionConfirmation',
      MessageId: 'sns-sc',
      TopicArn: 'arn:aws:sns:us-east-1:123:inbound',
      Token: 'tok',
      Message: 'You have chosen to subscribe...',
      SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&Token=tok',
      Timestamp: '2024-01-01T00:00:00Z',
      SignatureVersion: '1',
      Signature: 'sig',
      SigningCertURL: 'https://sns.us-east-1.amazonaws.com/cert.pem',
    })
    const email = await parseWebhookPayload({}, body)
    expect(email.subject).toBe('__sns:SubscriptionConfirmation')
    expect(email.headers['x-sns-subscribe-url']).toBe(
      'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&Token=tok',
    )
  })

  it('CONSUMER PROPERTY + lifecycle: a realistic multipart email survives normalization intact, then replies threaded through the REAL outbound bond', async () => {
    const email = await parseWebhookPayload(
      {},
      snsEnvelope({
        notificationType: 'Received',
        mail: {
          timestamp: '2024-01-01T00:00:03Z',
          source: 'alice@example.com',
          messageId: 'ses-amzn-1',
          destination: ['support@desk.example'],
        },
        content: Buffer.from(rawMime, 'utf8').toString('base64'),
      }),
    )

    // REAL mailparser: encoded-word subject decoded, quoted-printable body
    // decoded, binary attachment bytes intact, threading ids unwrapped.
    expect(email.id).toBe('ses-amzn-1') // SES's id (stable dedupe key)
    expect(email.messageId).toBe('orig-1@mail.example.com') // MIME Message-ID
    expect(email.from).toContain('alice@example.com')
    expect(email.to).toEqual(['support@desk.example'])
    expect(email.cc).toEqual(['mgr@example.com'])
    expect(email.subject).toBe('Beschwerde: café 🔥')
    expect(email.textBody?.trim()).toBe('The café espresso machine is on fire.')
    expect(email.inReplyTo).toBe('prev-1@mail.example.com')
    expect(email.references).toEqual(['prev-0@mail.example.com', 'prev-1@mail.example.com'])
    expect(email.receivedAt).toEqual(new Date('2024-01-01T00:00:03Z'))
    expect(email.attachments).toHaveLength(1)
    const attachment = email.attachments![0]!
    expect(attachment.name).toBe('invoice.pdf')
    expect(attachment.contentType).toBe('application/pdf')
    expect(Buffer.from(attachment.contentBase64, 'base64').equals(attachmentBytes)).toBe(true)

    // Reply through the REAL @molecule/api-emails delegation.
    const delivered: EmailMessage[] = []
    const memoryTransport: EmailTransport = {
      async sendMail(msg: EmailMessage): Promise<EmailSendResult> {
        delivered.push(msg)
        return { accepted: ['alice@example.com'], rejected: [], messageId: '<reply-1@desk>' }
      },
    }
    setTransport(memoryTransport)

    expect(supportsReply()).toBe(true)
    const result = await replyTo(email, { textBody: 'A technician is on the way.' })
    expect(result.id).toBe('<reply-1@desk>')

    const sent = delivered[0]! as EmailMessage & { headers: Record<string, string> }
    expect(sent.from).toBe('support@desk.example')
    expect(sent.subject).toBe('Re: Beschwerde: café 🔥')
    // Threading: In-Reply-To points at the message being answered, References
    // extends the original chain with it.
    expect(sent.headers['In-Reply-To']).toBe('<orig-1@mail.example.com>')
    expect(sent.headers.References).toBe(
      '<prev-0@mail.example.com> <prev-1@mail.example.com> <orig-1@mail.example.com>',
    )
  })
})
