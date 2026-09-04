/**
 * Internal utilities for the AgentMail inbound-emails provider.
 *
 * Kept out of `provider.ts` so the signing/parsing helpers can be
 * unit-tested in isolation without touching the bond singleton or the
 * network.
 *
 * @module
 */

import { Buffer } from 'node:buffer'
import { timingSafeEqual } from 'node:crypto'

/**
 * Default replay window for inbound webhook timestamps, in seconds.
 *
 * AgentMail delivers webhooks through Svix, whose documented default
 * tolerance for `svix-timestamp` is five minutes.
 */
export const DEFAULT_REPLAY_WINDOW_SECONDS = 300

/** Default AgentMail API base URL (production). */
export const DEFAULT_BASE_URL = 'https://api.agentmail.to'

/** Prefix Svix puts on webhook signing secrets before the base64 key. */
export const WEBHOOK_SECRET_PREFIX = 'whsec_'

/** The only signature-scheme version this bond understands. */
export const SIGNATURE_VERSION = 'v1'

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
 * Coerces the request body into a UTF-8 string. Buffers are decoded as
 * UTF-8 (AgentMail POSTs `application/json`), strings are returned as-is.
 *
 * @param body - The raw body.
 * @returns The body as a UTF-8 string.
 */
export const bodyToString = (body: Buffer | string): string => {
  return Buffer.isBuffer(body) ? body.toString('utf8') : body
}

/**
 * Narrowing guard for a plain JSON object.
 *
 * @param value - Any value.
 * @returns `true` when `value` is a non-null, non-array object.
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Parses a JSON request body. Accepts the raw bytes/string of the request
 * or an already-parsed object (Express's JSON middleware gives us the
 * latter when a JSON route captures the webhook).
 *
 * @param body - Raw body or pre-parsed object.
 * @returns The parsed JSON value.
 * @throws {SyntaxError} When a string/Buffer body is not valid JSON.
 */
export const parseJsonBody = (body: Buffer | string | Record<string, unknown>): unknown => {
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    return JSON.parse(bodyToString(body))
  }
  return body
}

/**
 * Decodes a Svix-style signing secret into raw key bytes: strip the
 * `whsec_` prefix, then base64-decode the remainder. A secret without the
 * prefix is base64-decoded as-is (the Svix libraries do the same).
 *
 * @param secret - The signing secret as configured.
 * @returns The HMAC key bytes (empty when the secret decodes to nothing).
 */
export const decodeWebhookSecret = (secret: string): Buffer => {
  const trimmed = secret.trim()
  const encoded = trimmed.startsWith(WEBHOOK_SECRET_PREFIX)
    ? trimmed.slice(WEBHOOK_SECRET_PREFIX.length)
    : trimmed
  return Buffer.from(encoded, 'base64')
}

/**
 * Builds the exact bytes Svix signs: `${id}.${timestamp}.` followed by the
 * raw request body, unchanged. Returned as a Buffer so a body that is not
 * valid UTF-8 still signs byte-for-byte.
 *
 * @param id - The `svix-id` header value.
 * @param timestamp - The `svix-timestamp` header value (as received).
 * @param body - The raw request body.
 * @returns The signed content.
 */
export const buildSignedContent = (
  id: string,
  timestamp: string,
  body: Buffer | string,
): Buffer => {
  const bodyBytes = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8')
  return Buffer.concat([Buffer.from(`${id}.${timestamp}.`, 'utf8'), bodyBytes])
}

/**
 * Splits a `svix-signature` header — a space-delimited list of
 * `<version>,<base64>` entries (e.g. `v1,abc v1,def`) — into the `v1`
 * signatures. Entries of any other version are ignored, not rejected: Svix
 * may add versions and a receiver is expected to match on any one it
 * understands.
 *
 * @param value - The raw header value.
 * @returns The base64 `v1` signatures (empty when none are present).
 */
export const parseSignatureHeader = (value: string | undefined): string[] => {
  if (!value) return []
  const out: string[] = []
  for (const entry of value.split(/\s+/u)) {
    const separator = entry.indexOf(',')
    if (separator <= 0) continue
    const version = entry.slice(0, separator)
    const signature = entry.slice(separator + 1)
    if (version === SIGNATURE_VERSION && signature.length > 0) out.push(signature)
  }
  return out
}

/**
 * Constant-time comparison of two base64-encoded digests.
 *
 * @param a - The first digest.
 * @param b - The second digest.
 * @returns `true` when the decoded bytes are equal.
 */
export const safeEqualBase64 = (a: string, b: string): boolean => {
  const left = Buffer.from(a, 'base64')
  const right = Buffer.from(b, 'base64')
  if (left.length === 0 || left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/**
 * Normalizes an address field that AgentMail types as `string` in one
 * place and `string[]` in another into a trimmed, non-empty string array.
 *
 * @param value - The raw field value.
 * @returns The addresses (empty when the field is absent or malformed).
 */
export const normalizeAddressList = (value: unknown): string[] => {
  const raw: unknown[] = Array.isArray(value) ? value : [value]
  const out: string[] = []
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const trimmed = entry.trim()
    if (trimmed.length > 0) out.push(trimmed)
  }
  return out
}

/**
 * Recovers the core's normalized headers map (lowercased names,
 * multi-value headers as arrays) from AgentMail's `headers` object. Any
 * non-string value is skipped; a missing or malformed map yields `{}`.
 *
 * @param value - The raw `headers` field.
 * @returns Normalized headers map.
 */
export const lowercaseHeaderMap = (value: unknown): Record<string, string | string[]> => {
  const out: Record<string, string | string[]> = {}
  if (!isRecord(value)) return out
  for (const [nameRaw, valueRaw] of Object.entries(value)) {
    const values: string[] = Array.isArray(valueRaw)
      ? valueRaw.filter((v): v is string => typeof v === 'string')
      : typeof valueRaw === 'string'
        ? [valueRaw]
        : []
    const name = nameRaw.toLowerCase()
    for (const entry of values) {
      const existing = out[name]
      if (existing === undefined) {
        out[name] = entry
      } else if (Array.isArray(existing)) {
        existing.push(entry)
      } else {
        out[name] = [existing, entry]
      }
    }
  }
  return out
}

/**
 * Strips surrounding angle brackets from a `Message-ID` value.
 *
 * @param value - The raw value (with or without angle brackets).
 * @returns The value without angle brackets, or `undefined` if input was
 *   empty or not a string.
 */
export const unwrapMessageId = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined
  return trimmed.replace(/^<|>$/gu, '')
}

/**
 * Parses an ISO 8601 timestamp into a `Date`.
 *
 * @param value - The raw field value.
 * @returns The date, or `undefined` when absent or unparseable.
 */
export const parseTimestamp = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' || value.length === 0) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/**
 * Parses a `Retry-After` header, which is equally valid as delta-seconds
 * (`'30'`) or an HTTP-date, into whole seconds from now.
 *
 * @param value - The raw header value.
 * @returns Seconds to wait (never negative), or `undefined` when absent or
 *   unparseable.
 */
export const parseRetryAfterSeconds = (value: string | null | undefined): number | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (/^\d+$/u.test(trimmed)) return Number.parseInt(trimmed, 10)
  const at = Date.parse(trimmed)
  if (Number.isNaN(at)) return undefined
  return Math.max(0, Math.ceil((at - Date.now()) / 1000))
}
