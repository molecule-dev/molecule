/**
 * Mailgun Routes inbound-email provider implementation.
 *
 * Mailgun parses inbound mail upstream and POSTs the result to a configured
 * Route as `application/x-www-form-urlencoded`. Each request also carries
 * three signing fields — `timestamp`, `token`, `signature` — that this
 * module verifies via HMAC-SHA256 against the account's API key.
 *
 * Reply dispatch is composed onto the outbound `@molecule/api-emails` bond
 * (the standard `EmailTransport`); we never reimplement the SMTP path here.
 *
 * @see https://documentation.mailgun.com/en/latest/user_manual.html#routes
 *
 * @module
 */

import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'

import { sendMail } from '@molecule/api-emails'
import { configNotConfiguredError } from '@molecule/api-secrets'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'
import type {
  InboundEmail,
  InboundEmailAttachment,
  InboundEmailProvider,
  InboundEmailReply,
  InboundEmailReplyResult,
} from '@molecule/api-emails-inbound'

import {
  DEFAULT_REPLAY_WINDOW_SECONDS,
  parseFormBody,
  parseMailgunMessageHeaders,
  splitAddressList,
  splitReferences,
  unwrapMessageId,
} from './utilities.js'

/**
 * Reads the Mailgun API key from the environment, throwing a generic
 * configuration error (without revealing any value) when it is unset.
 *
 * @returns The Mailgun API key string.
 */
const getApiKey = (): string => {
  const apiKey = process.env.MAILGUN_API_KEY
  if (!apiKey) {
    // Tagged config-missing error → clean 503 + 'config.notConfigured', with the
    // registered definition's description + setup URL (see classifyTaggedError).
    throw configNotConfiguredError('MAILGUN_API_KEY', 'inbound email')
  }
  return apiKey
}

/**
 * Reads the configured replay window (seconds) for inbound webhooks. Falls
 * back to {@link DEFAULT_REPLAY_WINDOW_SECONDS} when unset or invalid.
 *
 * @returns The replay window in seconds.
 */
const getReplayWindowSeconds = (): number => {
  const raw = process.env.MAILGUN_INBOUND_REPLAY_WINDOW_SECONDS
  if (!raw) return DEFAULT_REPLAY_WINDOW_SECONDS
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REPLAY_WINDOW_SECONDS
}

/**
 * Constant-time comparison of two equal-length hex digests.
 *
 * @param a - The first digest.
 * @param b - The second digest.
 * @returns `true` when the digests are byte-equal.
 */
const safeEqualHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch (_error) {
    // timingSafeEqual throws if the two Buffers have different byte lengths,
    // which cannot happen here after the length guard above. Any other failure
    // (e.g. invalid hex encoding) also means the signature is invalid.
    return false
  }
}

/**
 * Verifies a Mailgun inbound webhook signature. Mailgun computes the
 * signature as `HMAC-SHA256(key=api_key, msg=timestamp + token)`, where
 * `+` is string concatenation (no separator). Implementations MUST be
 * constant-time and MUST reject stale timestamps.
 *
 * The `body` parameter is the raw form-encoded body that carries the
 * signing fields. Header-only signing schemes are not supported by Mailgun
 * Routes.
 *
 * @param _headers - HTTP headers (unused — Mailgun signs via form fields).
 * @param body - Raw HTTP request body (form-encoded).
 * @returns `true` when the signature verifies and the timestamp is fresh.
 */
export const verifySignature = async (
  _headers: Record<string, string | string[] | undefined>,
  body: Buffer | string,
): Promise<boolean> => {
  let apiKey: string
  try {
    apiKey = getApiKey()
  } catch (_error) {
    // MAILGUN_API_KEY is not configured — cannot verify. Treat as invalid rather
    // than throwing so the caller receives a clean false instead of a 500.
    return false
  }

  const fields = parseFormBody(body)
  const timestamp = fields.timestamp
  const token = fields.token
  const signature = fields.signature

  if (!timestamp || !token || !signature) return false

  // Reject stale timestamps to defend against replay (Mailgun tokens are
  // single-use, but the time bound is belt-and-suspenders).
  const ts = Number.parseInt(timestamp, 10)
  if (!Number.isFinite(ts)) return false
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSeconds - ts) > getReplayWindowSeconds()) return false

  const expected = createHmac('sha256', apiKey)
    .update(timestamp + token)
    .digest('hex')

  return safeEqualHex(expected, signature.toLowerCase())
}

/**
 * Builds the {@link InboundEmailAttachment} list from Mailgun's
 * form-encoded `attachment-N` and `attachment-count` fields.
 *
 * Mailgun in form-only mode encodes each attachment as JSON in the
 * `attachment-N` field (`{"name","content-type","size","content"}`), where
 * `content` is the base64-encoded payload. We map this onto the normalized
 * shape and skip any entry that fails to parse.
 *
 * @param fields - Parsed form fields.
 * @returns Array of attachments (empty when none are present).
 */
const parseFormAttachments = (fields: Record<string, string>): InboundEmailAttachment[] => {
  const out: InboundEmailAttachment[] = []
  const countRaw = fields['attachment-count']
  const count = Number.parseInt(countRaw ?? '0', 10)
  if (!Number.isFinite(count) || count <= 0) return out

  for (let i = 1; i <= count; i += 1) {
    const raw = fields[`attachment-${String(i)}`]
    if (!raw) continue

    let parsed: Record<string, unknown> | undefined
    try {
      const candidate = JSON.parse(raw)
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        parsed = candidate as Record<string, unknown>
      }
    } catch (_error) {
      // Mailgun sent a malformed attachment JSON field — skip this entry rather
      // than aborting the whole parse; other attachments and the email body are
      // still valid.
      continue
    }
    if (!parsed) continue

    const name = typeof parsed.name === 'string' ? parsed.name : `attachment-${String(i)}`
    const contentType =
      typeof parsed['content-type'] === 'string'
        ? (parsed['content-type'] as string)
        : 'application/octet-stream'
    const sizeRaw = parsed.size
    const sizeBytes = typeof sizeRaw === 'number' ? sizeRaw : undefined
    const contentRaw = parsed.content
    const contentBase64 =
      typeof contentRaw === 'string'
        ? // Mailgun documents the `content` as already base64-encoded.
          contentRaw
        : ''
    const contentId =
      typeof parsed['content-id'] === 'string' ? (parsed['content-id'] as string) : undefined

    const attachment: InboundEmailAttachment = {
      name,
      contentType,
      contentBase64,
    }
    if (sizeBytes !== undefined) attachment.sizeBytes = sizeBytes
    if (contentId !== undefined) attachment.contentId = contentId
    out.push(attachment)
  }

  return out
}

/**
 * Parses a Mailgun Routes inbound webhook payload into a normalized
 * {@link InboundEmail}.
 *
 * Mailgun POSTs `application/x-www-form-urlencoded` data with keys such as
 * `From`, `To`, `Cc`, `subject`, `body-plain`, `body-html`, `Message-Id`,
 * `In-Reply-To`, `References`, `attachment-count`, `attachment-N`, plus
 * the signing triple. We only extract domain-relevant fields here;
 * verification is done separately by {@link verifySignature}.
 *
 * @param _headers - HTTP headers (unused — Mailgun puts everything in the body).
 * @param body - The raw form-encoded body, a string, or an already-parsed object.
 * @returns The normalized inbound email.
 */
export const parseWebhookPayload = async (
  _headers: Record<string, string | string[] | undefined>,
  body: Buffer | string | Record<string, unknown>,
): Promise<InboundEmail> => {
  const fields = parseFormBody(body)

  const messageHeaders = parseMailgunMessageHeaders(fields['message-headers'])

  const messageId = unwrapMessageId(fields['Message-Id'] ?? fields['message-id'])
  const inReplyTo = unwrapMessageId(fields['In-Reply-To'] ?? fields['in-reply-to'])
  const references = splitReferences(fields.References ?? fields.references).map((ref) => {
    const unwrapped = unwrapMessageId(ref)
    return unwrapped ?? ref
  })

  const timestampRaw = fields.timestamp
  const timestampSeconds = Number.parseInt(timestampRaw ?? '', 10)
  const receivedAt = Number.isFinite(timestampSeconds)
    ? new Date(timestampSeconds * 1000)
    : new Date()

  const email: InboundEmail = {
    id: messageId ?? fields.token ?? `mailgun-${String(Date.now())}`,
    from: fields.From ?? fields.from ?? fields.sender ?? '',
    to: splitAddressList(fields.To ?? fields.to ?? fields.recipient),
    subject: fields.Subject ?? fields.subject ?? '',
    headers: messageHeaders,
    receivedAt,
  }

  const cc = splitAddressList(fields.Cc ?? fields.cc)
  if (cc.length > 0) email.cc = cc

  const textBody = fields['body-plain']
  if (textBody !== undefined) email.textBody = textBody

  const htmlBody = fields['body-html']
  if (htmlBody !== undefined) email.htmlBody = htmlBody

  const attachments = parseFormAttachments(fields)
  if (attachments.length > 0) email.attachments = attachments

  if (messageId) email.messageId = messageId
  if (inReplyTo) email.inReplyTo = inReplyTo
  if (references.length > 0) email.references = references

  return email
}

/**
 * Decodes a base64 string into a Node `Buffer`. Defined inline so the
 * provider does not pull in extra dependencies for a one-line operation.
 *
 * @param value - The base64 string.
 * @returns The decoded buffer.
 */
const base64ToBuffer = (value: string): Buffer => Buffer.from(value, 'base64')

/**
 * Dispatches an outbound reply through the bonded `@molecule/api-emails`
 * transport. Mailgun's outbound API is already exposed via
 * `@molecule/api-emails-mailgun`, so we compose rather than reimplement.
 *
 * The reply's `In-Reply-To` and `References` headers are populated from
 * the original message when present, so threading works in the recipient's
 * mail client.
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

  // Build threading headers from the original message so the recipient's
  // mail client groups the reply into the existing thread. We pass them
  // alongside the normalized EmailMessage shape via a structural cast —
  // every concrete EmailTransport (nodemailer, SES, etc.) honours a
  // `headers` field, and the cast keeps the core EmailMessage type lean.
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
          attachments: reply.attachments.map((a) => ({
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
 * `@molecule/api-emails-mailgun`.
 *
 * @returns Always `true`.
 */
export const supportsReply = (): boolean => true

/**
 * The Mailgun Routes inbound-email provider implementing the
 * {@link InboundEmailProvider} interface.
 */
export const provider: InboundEmailProvider = {
  parseWebhookPayload,
  verifySignature,
  replyTo,
  supportsReply,
}
