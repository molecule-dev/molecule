/**
 * Internal utilities for the AWS SES inbound-email provider.
 *
 * Kept out of `provider.ts` so the parsing helpers can be unit-tested in
 * isolation without touching the bond singleton.
 *
 * @module
 */

import { Buffer } from 'node:buffer'

import { simpleParser } from 'mailparser'

import type { InboundEmail, InboundEmailAttachment } from '@molecule/api-emails-inbound'

import { SNS_SIGNING_CERT_HOSTNAME_SUFFIXES } from './types.js'

/**
 * Coerces an HTTP header value (which may be `string`, `string[]`, or
 * `undefined`) to a single string. Multi-value headers are joined with
 * `, ` per RFC 9110 §5.2.
 *
 * @param value - The header value to coerce.
 * @returns The header value as a single string, or `undefined` when the
 *   header was not present.
 */
export const headerToString = (value: string | string[] | undefined): string | undefined => {
  if (value === undefined) return undefined
  return Array.isArray(value) ? value.join(', ') : value
}

/**
 * Returns the value of `headers[name]` (case-insensitive) coerced to a
 * single string.
 *
 * @param headers - The headers object.
 * @param name - The header name (case-insensitive).
 * @returns The header value as a single string, or `undefined` if absent.
 */
export const getHeader = (
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined => {
  const target = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === target) {
      return headerToString(headers[key])
    }
  }
  return undefined
}

/**
 * Coerces the request body into a UTF-8 string. SNS POSTs JSON as UTF-8.
 *
 * @param body - The raw body.
 * @returns The body as a UTF-8 string.
 */
export const bodyToString = (body: Buffer | string): string => {
  return Buffer.isBuffer(body) ? body.toString('utf8') : body
}

/**
 * Parses a Buffer/string/object body as an SNS JSON payload. Throws
 * (caught by the caller) when the body is not valid JSON.
 *
 * @param body - The raw body.
 * @returns The parsed object.
 */
export const parseJsonBody = (body: Buffer | string | Record<string, unknown>): unknown => {
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    return JSON.parse(bodyToString(body)) as unknown
  }
  return body
}

/**
 * Returns the configured allowlist of hostname suffixes for the SNS
 * `SigningCertURL`. Defaults to {@link SNS_SIGNING_CERT_HOSTNAME_SUFFIXES}
 * when the env override is unset.
 *
 * @returns The allowlist of hostname suffixes.
 */
export const getSigningCertHostnameSuffixes = (): readonly string[] => {
  const raw = process.env.AWS_SNS_SIGNING_CERT_HOSTNAME_SUFFIXES
  if (!raw) return SNS_SIGNING_CERT_HOSTNAME_SUFFIXES
  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  return parts.length > 0 ? parts : SNS_SIGNING_CERT_HOSTNAME_SUFFIXES
}

/**
 * Validates that an SNS `SigningCertURL` is HTTPS and its hostname matches
 * an entry in the allowlist. Defends against SSRF and certificate
 * substitution attacks where an attacker tricks the verifier into fetching
 * a cert from a host they control.
 *
 * @param url - The candidate URL string.
 * @returns `true` when the URL is acceptable.
 */
export const isAllowedSigningCertUrl = (url: string): boolean => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch (_error) {
    // URL constructor throws on malformed input — a parse failure IS the
    // validation signal; returning false is the correct, safe response.
    return false
  }
  if (parsed.protocol !== 'https:') return false
  const host = parsed.hostname.toLowerCase()
  for (const suffix of getSigningCertHostnameSuffixes()) {
    const normalized = suffix.startsWith('.') ? suffix : `.${suffix}`
    if (host === normalized.slice(1) || host.endsWith(normalized)) {
      return true
    }
  }
  return false
}

/**
 * Builds the canonical string SNS signs for the supplied notification.
 * The exact field order is mandated by the SNS message-and-signature
 * format; the canonical string is built from key/value pairs separated by
 * `\n`, with a trailing `\n` after the last value.
 *
 * @param payload - The SNS notification payload.
 * @returns The canonical string suitable for HMAC verification.
 *
 * @see https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 */
export const buildSnsCanonicalString = (payload: {
  Type?: string
  Message?: string
  MessageId?: string
  Subject?: string
  SubscribeURL?: string
  Timestamp?: string
  Token?: string
  TopicArn?: string
}): string => {
  const orderedKeys =
    payload.Type === 'SubscriptionConfirmation' || payload.Type === 'UnsubscribeConfirmation'
      ? ([
          'Message',
          'MessageId',
          'SubscribeURL',
          'Timestamp',
          'Token',
          'TopicArn',
          'Type',
        ] as const)
      : (['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'] as const)

  const parts: string[] = []
  for (const key of orderedKeys) {
    const value = (payload as Record<string, string | undefined>)[key]
    if (value === undefined) continue
    parts.push(key)
    parts.push(value)
  }
  return `${parts.join('\n')}\n`
}

/**
 * Splits a `References:` header (whitespace-separated `<message-id>`
 * tokens) into individual values, preserving the angle brackets.
 *
 * @param value - The raw header value.
 * @returns Array of message-id tokens (with angle brackets) or empty.
 */
export const splitReferences = (value: string | undefined): string[] => {
  if (!value) return []
  return value
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
}

/**
 * Strips surrounding angle brackets from a `Message-ID` value.
 *
 * @param value - The raw value (with or without angle brackets).
 * @returns The value without angle brackets, or `undefined` if input was empty.
 */
export const unwrapMessageId = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  return trimmed.replace(/^<|>$/gu, '')
}

/**
 * Decodes a base64 string into a Node `Buffer`.
 *
 * @param value - The base64 string.
 * @returns The decoded buffer.
 */
export const base64ToBuffer = (value: string): Buffer => Buffer.from(value, 'base64')

/**
 * Parses a raw RFC 822 MIME message into a normalized {@link InboundEmail}.
 *
 * Used internally by `parseWebhookPayload` after the SES `content` field
 * has been base64-decoded. Exposed so that applications using SES's
 * S3-only delivery mode can reuse the same parser by fetching the S3
 * object themselves and calling this helper.
 *
 * @param raw - The raw RFC 822 message bytes.
 * @param overrides - Optional fields to override on the parsed result
 *   (e.g. an SES-assigned `id` or `receivedAt` timestamp).
 * @returns The normalized inbound email.
 */
export const parseRawMimeContent = async (
  raw: Buffer | string,
  overrides: Partial<InboundEmail> = {},
): Promise<InboundEmail> => {
  const buffer = typeof raw === 'string' ? Buffer.from(raw, 'utf8') : raw
  const parsed = await simpleParser(buffer)

  const fromText =
    parsed.from && typeof parsed.from === 'object' && 'text' in parsed.from
      ? ((parsed.from as { text?: string }).text ?? '')
      : ''

  const toAddresses: string[] = (() => {
    const t = parsed.to
    if (!t) return []
    const list = Array.isArray(t) ? t : [t]
    const out: string[] = []
    for (const entry of list) {
      if (entry && typeof entry === 'object' && 'value' in entry) {
        for (const v of (entry as { value: Array<{ address?: string }> }).value) {
          if (v.address) out.push(v.address)
        }
      }
    }
    return out
  })()

  const ccAddresses: string[] = (() => {
    const c = parsed.cc
    if (!c) return []
    const list = Array.isArray(c) ? c : [c]
    const out: string[] = []
    for (const entry of list) {
      if (entry && typeof entry === 'object' && 'value' in entry) {
        for (const v of (entry as { value: Array<{ address?: string }> }).value) {
          if (v.address) out.push(v.address)
        }
      }
    }
    return out
  })()

  const headers: Record<string, string | string[]> = {}
  if (parsed.headers) {
    for (const [name, value] of parsed.headers.entries()) {
      const lower = name.toLowerCase()
      if (typeof value === 'string') {
        headers[lower] = value
      } else if (Array.isArray(value)) {
        const strings = value.filter((v): v is string => typeof v === 'string')
        if (strings.length > 0) headers[lower] = strings.length === 1 ? strings[0]! : strings
      } else if (value && typeof value === 'object') {
        // mailparser returns parsed objects for some headers (Date, addresses);
        // we serialize their `text` form when present, else JSON.
        const obj = value as { text?: string }
        if (typeof obj.text === 'string') headers[lower] = obj.text
      }
    }
  }

  const attachments: InboundEmailAttachment[] = []
  if (Array.isArray(parsed.attachments)) {
    for (const att of parsed.attachments) {
      const name =
        typeof att.filename === 'string' && att.filename.length > 0 ? att.filename : 'attachment'
      const contentType =
        typeof att.contentType === 'string' && att.contentType.length > 0
          ? att.contentType
          : 'application/octet-stream'
      const content = att.content
      const contentBase64 = Buffer.isBuffer(content)
        ? content.toString('base64')
        : typeof content === 'string'
          ? Buffer.from(content, 'utf8').toString('base64')
          : ''
      const entry: InboundEmailAttachment = {
        name,
        contentType,
        contentBase64,
      }
      if (typeof att.size === 'number') entry.sizeBytes = att.size
      const cid =
        (att as { cid?: string; contentId?: string }).cid ??
        (att as { contentId?: string }).contentId
      if (typeof cid === 'string' && cid.length > 0) entry.contentId = cid
      attachments.push(entry)
    }
  }

  const messageId = unwrapMessageId(
    typeof parsed.messageId === 'string' ? parsed.messageId : undefined,
  )
  const inReplyTo = unwrapMessageId(
    typeof parsed.inReplyTo === 'string' ? parsed.inReplyTo : undefined,
  )
  const references: string[] = (() => {
    const r = parsed.references
    if (!r) return []
    const list = Array.isArray(r) ? r : [r]
    return list
      .filter((v): v is string => typeof v === 'string')
      .map((v) => unwrapMessageId(v) ?? v)
  })()

  const date =
    parsed.date instanceof Date
      ? parsed.date
      : parsed.date
        ? new Date(String(parsed.date))
        : new Date()

  const email: InboundEmail = {
    id: messageId ?? `ses-${String(Date.now())}`,
    from: fromText,
    to: toAddresses,
    subject: typeof parsed.subject === 'string' ? parsed.subject : '',
    headers,
    receivedAt: date,
  }

  if (ccAddresses.length > 0) email.cc = ccAddresses
  if (typeof parsed.text === 'string') email.textBody = parsed.text
  if (typeof parsed.html === 'string') email.htmlBody = parsed.html
  if (attachments.length > 0) email.attachments = attachments
  if (messageId) email.messageId = messageId
  if (inReplyTo) email.inReplyTo = inReplyTo
  if (references.length > 0) email.references = references

  return { ...email, ...overrides }
}
