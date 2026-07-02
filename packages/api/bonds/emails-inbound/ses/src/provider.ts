/**
 * AWS SES inbound-email provider implementation.
 *
 * SES Inbound parses received mail upstream and either delivers the message
 * to S3 or publishes a notification (with the parsed `mail` metadata and
 * optional base64-encoded raw RFC 822 `content`) to an SNS topic. This
 * bond handles the SNS-notification path: an HTTPS endpoint subscribed to
 * the topic receives JSON, validates the SNS signature, and parses the
 * embedded `content` (RFC 822) into a normalized `InboundEmail`.
 *
 * Outbound replies compose onto the bonded `@molecule/api-emails`
 * transport (typically `@molecule/api-emails-ses`); we never reimplement
 * SMTP / SES SendEmail here.
 *
 * @see https://docs.aws.amazon.com/ses/latest/dg/receiving-email-notifications.html
 * @see https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 *
 * @module
 */

import { Buffer } from 'node:buffer'
import { createPublicKey, createVerify } from 'node:crypto'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { sendMail } from '@molecule/api-emails'
import type {
  InboundEmail,
  InboundEmailAttachment,
  InboundEmailProvider,
  InboundEmailReply,
  InboundEmailReplyResult,
} from '@molecule/api-emails-inbound'

import type { SesInboundNotificationMessage, SnsNotificationPayload } from './types.js'
import {
  base64ToBuffer,
  buildSnsCanonicalString,
  isAllowedSigningCertUrl,
  parseJsonBody,
  parseRawMimeContent,
  splitReferences,
  unwrapMessageId,
} from './utilities.js'

/**
 * Cache of fetched SNS signing certificate PEM bodies, keyed by
 * `SigningCertURL`. AWS rotates these infrequently and serves them from a
 * CloudFront-fronted endpoint, so caching reduces per-request latency
 * without compromising security (the URL itself is allowlisted).
 */
const certCache = new Map<string, string>()

/**
 * Resets the cached signing certificates. Exposed for tests.
 */
export const _resetSigningCertCache = (): void => {
  certCache.clear()
}

/**
 * Fetches an SNS signing certificate. Validates the URL against the
 * allowlist before performing any network I/O.
 *
 * @param url - The `SigningCertURL` from the SNS payload.
 * @returns The PEM-encoded certificate body, or `undefined` when the URL
 *   is not allowlisted or the fetch fails.
 */
const fetchSigningCert = async (url: string): Promise<string | undefined> => {
  if (!isAllowedSigningCertUrl(url)) return undefined

  const cached = certCache.get(url)
  if (cached !== undefined) return cached

  try {
    const response = await fetch(url)
    if (!response.ok) return undefined
    const pem = await response.text()
    if (!pem.includes('BEGIN CERTIFICATE')) return undefined
    certCache.set(url, pem)
    return pem
  } catch (_error) {
    // Best-effort fetch — network failures are surfaced as `undefined`; the
    // caller treats a missing cert as a signature-verification failure (false).
    return undefined
  }
}

/**
 * Type guard for the subset of {@link SnsNotificationPayload} fields we
 * rely on. Returns `false` for malformed payloads without throwing.
 *
 * @param value - Candidate parsed JSON body.
 * @returns `true` when `value` looks like an SNS payload.
 */
const isSnsPayload = (value: unknown): value is SnsNotificationPayload => {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.Type === 'string' &&
    typeof v.MessageId === 'string' &&
    typeof v.Message === 'string' &&
    typeof v.Timestamp === 'string' &&
    typeof v.Signature === 'string' &&
    typeof v.SigningCertURL === 'string' &&
    typeof v.SignatureVersion === 'string'
  )
}

/**
 * Verifies the signature of an SNS notification payload. Implements the
 * AWS SNS signature-verification flow:
 *
 * 1. Parse the JSON body.
 * 2. Reject if `SigningCertURL` is not from an allowlisted host.
 * 3. Fetch the X.509 certificate from `SigningCertURL`.
 * 4. Build the canonical string per AWS docs (field order varies by
 *    `Type`).
 * 5. Verify the base64-decoded `Signature` against the canonical string
 *    using SHA1 (`SignatureVersion === '1'`) or SHA256
 *    (`SignatureVersion === '2'`).
 * 6. When `AWS_SES_INBOUND_TOPIC_ARN` is set, also verify the payload's
 *    `TopicArn` matches.
 *
 * Errors NEVER leak signing material; failures simply return `false`.
 *
 * @param _headers - HTTP headers (unused — SNS signs the body).
 * @param body - Raw HTTP request body (JSON).
 * @returns `true` when the signature is valid, `false` otherwise.
 */
export const verifySignature = async (
  _headers: Record<string, string | string[] | undefined>,
  body: Buffer | string,
): Promise<boolean> => {
  let parsed: unknown
  try {
    parsed = parseJsonBody(body)
  } catch (_error) {
    // Malformed body — not a valid SNS notification; return false (no signature).
    return false
  }
  if (!isSnsPayload(parsed)) return false

  const expectedTopic = process.env.AWS_SES_INBOUND_TOPIC_ARN
  if (expectedTopic && parsed.TopicArn !== expectedTopic) return false

  if (!isAllowedSigningCertUrl(parsed.SigningCertURL)) return false

  const pem = await fetchSigningCert(parsed.SigningCertURL)
  if (!pem) return false

  const algorithm =
    parsed.SignatureVersion === '2'
      ? 'RSA-SHA256'
      : parsed.SignatureVersion === '1'
        ? 'RSA-SHA1'
        : undefined
  if (!algorithm) return false

  let canonical: string
  try {
    canonical = buildSnsCanonicalString(parsed)
  } catch (_error) {
    // Malformed payload fields — cannot build the canonical string; treat as invalid.
    return false
  }

  let signatureBuffer: Buffer
  try {
    signatureBuffer = Buffer.from(parsed.Signature, 'base64')
  } catch (_error) {
    // Invalid base64 signature value — cannot decode; treat as invalid.
    return false
  }
  if (signatureBuffer.length === 0) return false

  try {
    const publicKey = createPublicKey(pem)
    const verifier = createVerify(algorithm)
    verifier.update(canonical, 'utf8')
    verifier.end()
    return verifier.verify(publicKey, signatureBuffer)
  } catch (_error) {
    // Crypto errors (bad PEM, unsupported key, verify failure) — treat as invalid signature.
    return false
  }
}

/**
 * Maps an SES `commonHeaders` block onto the normalized header dict.
 *
 * @param mail - The SES `mail` object.
 * @returns A `Record` of lowercased header names to values.
 */
const headersFromSesMail = (
  mail: SesInboundNotificationMessage['mail'],
): Record<string, string | string[]> => {
  const out: Record<string, string | string[]> = {}
  if (Array.isArray(mail.headers)) {
    for (const h of mail.headers) {
      if (!h || typeof h.name !== 'string' || typeof h.value !== 'string') continue
      const lower = h.name.toLowerCase()
      const existing = out[lower]
      if (existing === undefined) {
        out[lower] = h.value
      } else if (Array.isArray(existing)) {
        existing.push(h.value)
      } else {
        out[lower] = [existing, h.value]
      }
    }
  }
  const ch = mail.commonHeaders
  if (ch) {
    if (typeof ch.subject === 'string' && out.subject === undefined) out.subject = ch.subject
    if (typeof ch.messageId === 'string' && out['message-id'] === undefined)
      out['message-id'] = ch.messageId
    if (typeof ch.inReplyTo === 'string' && out['in-reply-to'] === undefined)
      out['in-reply-to'] = ch.inReplyTo
    if (typeof ch.references === 'string' && out.references === undefined)
      out.references = ch.references
  }
  return out
}

/**
 * Parses an SNS notification carrying an SES inbound-email payload into a
 * normalized {@link InboundEmail}.
 *
 * When the SES `Message.content` field is present, it is base64-decoded
 * and parsed as RFC 822 via `mailparser`. When `content` is absent
 * (header-only notifications), we synthesize an `InboundEmail` from the
 * SES `mail` metadata so the caller can still log/dedupe the message.
 *
 * SubscriptionConfirmation messages are returned as a synthetic
 * `InboundEmail` whose `subject` is `'__sns:SubscriptionConfirmation'` and
 * whose `headers['x-sns-subscribe-url']` carries the confirmation URL —
 * applications inspect this so they can subscribe out-of-band.
 *
 * @param _headers - HTTP headers (unused).
 * @param body - Raw HTTP body (SNS JSON).
 * @returns The normalized inbound email.
 */
export const parseWebhookPayload = async (
  _headers: Record<string, string | string[] | undefined>,
  body: Buffer | string | Record<string, unknown>,
): Promise<InboundEmail> => {
  let parsed: unknown
  try {
    parsed = parseJsonBody(body)
  } catch (error) {
    throw new Error('SES inbound webhook body is not valid JSON.', { cause: error })
  }
  if (!isSnsPayload(parsed)) {
    throw new Error('SES inbound webhook body is not an SNS notification payload.')
  }

  if (parsed.Type === 'SubscriptionConfirmation' || parsed.Type === 'UnsubscribeConfirmation') {
    const headers: Record<string, string | string[]> = {}
    if (typeof parsed.SubscribeURL === 'string')
      headers['x-sns-subscribe-url'] = parsed.SubscribeURL
    return {
      id: parsed.MessageId,
      from: '',
      to: [],
      subject: `__sns:${parsed.Type}`,
      headers,
      receivedAt: new Date(parsed.Timestamp),
    }
  }

  let sesMessage: SesInboundNotificationMessage
  try {
    sesMessage = JSON.parse(parsed.Message) as SesInboundNotificationMessage
  } catch (error) {
    throw new Error('SES inbound notification `Message` is not valid JSON.', { cause: error })
  }
  if (!sesMessage || typeof sesMessage !== 'object' || !sesMessage.mail) {
    throw new Error('SES inbound notification is missing the `mail` field.')
  }

  const sesReceivedAt = new Date(sesMessage.mail.timestamp)
  const sesMessageId = sesMessage.mail.messageId

  if (typeof sesMessage.content === 'string' && sesMessage.content.length > 0) {
    const raw = base64ToBuffer(sesMessage.content)
    const email = await parseRawMimeContent(raw, {
      id: sesMessageId,
      receivedAt: sesReceivedAt,
    })
    if (!email.messageId) email.messageId = sesMessageId
    return email
  }

  // Header-only notification — synthesize from SES metadata.
  const ch = sesMessage.mail.commonHeaders ?? {}
  const headers = headersFromSesMail(sesMessage.mail)
  const messageIdFromCommon = unwrapMessageId(ch.messageId)
  const inReplyTo = unwrapMessageId(ch.inReplyTo)
  const references = splitReferences(ch.references).map((ref) => unwrapMessageId(ref) ?? ref)

  const email: InboundEmail = {
    id: sesMessageId,
    from:
      Array.isArray(ch.from) && ch.from.length > 0 ? ch.from[0]! : (sesMessage.mail.source ?? ''),
    to:
      Array.isArray(ch.to) && ch.to.length > 0
        ? ch.to.slice()
        : Array.isArray(sesMessage.mail.destination)
          ? sesMessage.mail.destination.slice()
          : [],
    subject: typeof ch.subject === 'string' ? ch.subject : '',
    headers,
    receivedAt: sesReceivedAt,
  }

  if (Array.isArray(ch.cc) && ch.cc.length > 0) email.cc = ch.cc.slice()
  if (messageIdFromCommon) email.messageId = messageIdFromCommon
  else email.messageId = sesMessageId
  if (inReplyTo) email.inReplyTo = inReplyTo
  if (references.length > 0) email.references = references

  return email
}

/**
 * Dispatches an outbound reply through the bonded `@molecule/api-emails`
 * transport. The reply's `In-Reply-To` and `References` headers are
 * populated from the original message when present.
 *
 * @param email - The original inbound email being replied to.
 * @param reply - The reply payload.
 * @returns The reply dispatch result.
 */
export const replyTo = async (
  email: InboundEmail,
  reply: InboundEmailReply,
): Promise<InboundEmailReplyResult> => {
  const fromAddress = reply.from ?? (email.to.length > 0 ? email.to[0] : undefined)
  if (!fromAddress) {
    throw new Error(
      'Cannot dispatch inbound reply: no `from` address was supplied and the original email has no recipient to fall back to.',
    )
  }

  const subject = reply.subject ?? `Re: ${email.subject}`

  const threadingHeaders: Record<string, string> = {}
  if (email.messageId) {
    threadingHeaders['In-Reply-To'] = `<${email.messageId}>`
    const refs = email.references ? [...email.references] : []
    refs.push(email.messageId)
    threadingHeaders.References = refs.map((id) => `<${id}>`).join(' ')
  }

  const headers: Record<string, string> = {
    ...threadingHeaders,
    ...(reply.headers ?? {}),
  }

  const message = {
    from: fromAddress,
    to: email.from,
    subject,
    ...(reply.textBody !== undefined ? { text: reply.textBody } : {}),
    ...(reply.htmlBody !== undefined ? { html: reply.htmlBody } : {}),
    ...(reply.attachments && reply.attachments.length > 0
      ? {
          attachments: reply.attachments.map((a: InboundEmailAttachment) => ({
            filename: a.name,
            content: base64ToBuffer(a.contentBase64),
            contentType: a.contentType,
            ...(a.contentId !== undefined ? { cid: a.contentId } : {}),
          })),
        }
      : {}),
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  }

  const result = await sendMail(message as Parameters<typeof sendMail>[0])

  return {
    id: result.messageId ?? '',
  }
}

/**
 * Indicates that this provider supports outbound reply dispatch via
 * {@link replyTo}. The reply path requires the outbound
 * `@molecule/api-emails` bond to be wired with a transport — typically
 * `@molecule/api-emails-ses`.
 *
 * @returns Always `true`.
 */
export const supportsReply = (): boolean => true

/**
 * The AWS SES inbound-email provider implementing the
 * {@link InboundEmailProvider} interface.
 */
export const provider: InboundEmailProvider = {
  parseWebhookPayload,
  verifySignature,
  replyTo,
  supportsReply,
}
