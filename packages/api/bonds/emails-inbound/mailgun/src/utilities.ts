/**
 * Internal utilities for the Mailgun Routes inbound-emails provider.
 *
 * Kept out of `provider.ts` so the parsing helpers can be unit-tested in
 * isolation without touching the bond singleton.
 *
 * @module
 */

import { Buffer } from 'node:buffer'

/**
 * Default replay window for inbound webhook timestamps, in seconds.
 *
 * Mailgun signs every inbound POST with `timestamp`, `token`, and
 * `signature`. Tokens are single-use, but to defend against replay we also
 * reject any payload whose `timestamp` is older than this window.
 */
export const DEFAULT_REPLAY_WINDOW_SECONDS = 300

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
 * UTF-8 (Mailgun POSTs `application/x-www-form-urlencoded` ASCII), strings
 * are returned as-is.
 *
 * @param body - The raw body.
 * @returns The body as a UTF-8 string.
 */
export const bodyToString = (body: Buffer | string): string => {
  return Buffer.isBuffer(body) ? body.toString('utf8') : body
}

/**
 * Parses a `application/x-www-form-urlencoded` body into a flat
 * `Record<string, string>`. Fields that appear more than once keep their
 * first value (Mailgun does not duplicate fields).
 *
 * Accepts either a raw form-encoded string or an already-parsed object
 * (Express's `body-parser` middleware gives us the latter when a JSON
 * route accidentally captures the webhook). The pre-parsed-object branch
 * coerces every value to a string for consistent downstream parsing.
 *
 * @param body - Raw body or pre-parsed form object.
 * @returns Flat record of form fields.
 */
export const parseFormBody = (
  body: Buffer | string | Record<string, unknown>,
): Record<string, string> => {
  if (typeof body === 'string' || Buffer.isBuffer(body)) {
    const params = new URLSearchParams(bodyToString(body))
    const out: Record<string, string> = {}
    for (const [key, value] of params.entries()) {
      if (!(key in out)) out[key] = value
    }
    return out
  }

  // Already-parsed object: coerce every leaf to string.
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue
    out[key] = typeof value === 'string' ? value : String(value)
  }
  return out
}

/**
 * Splits a Mailgun recipient list (comma-separated mailbox list, possibly
 * with display names like `'Alice <a@x>, "Bob, Jr." <b@y>'`) into trimmed
 * RFC 5322 mailbox strings.
 *
 * Mailgun forwards the original `To:` and `Cc:` headers verbatim, so the
 * implementation needs to respect quoted-string commas.
 *
 * @param value - The raw header value.
 * @returns Array of trimmed mailbox strings (empty when `value` is empty).
 */
export const splitAddressList = (value: string | undefined): string[] => {
  if (!value) return []

  const out: string[] = []
  let depth = 0
  let inQuotes = false
  let current = ''

  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]

    if (ch === '"' && value[i - 1] !== '\\') {
      inQuotes = !inQuotes
      current += ch
      continue
    }
    if (!inQuotes) {
      if (ch === '<') depth += 1
      else if (ch === '>') depth = Math.max(0, depth - 1)
      else if (ch === ',' && depth === 0) {
        const trimmed = current.trim()
        if (trimmed) out.push(trimmed)
        current = ''
        continue
      }
    }
    current += ch
  }

  const trimmed = current.trim()
  if (trimmed) out.push(trimmed)
  return out
}

/**
 * Splits a `References:` header (whitespace-separated `<message-id>`
 * tokens) into individual values, including the angle brackets.
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
 * Recovers a normalized headers map from Mailgun's `message-headers` form
 * field (a JSON-encoded array of `[name, value]` tuples, e.g.
 * `[["Received","by ..."],["From","alice@example.com"]]`).
 *
 * Field names are lowercased; multi-value headers are returned as arrays.
 * Falls back to an empty record when the field is absent or invalid JSON.
 *
 * @param raw - The raw `message-headers` form field value.
 * @returns Normalized headers map.
 */
export const parseMailgunMessageHeaders = (
  raw: string | undefined,
): Record<string, string | string[]> => {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!Array.isArray(parsed)) return {}

  const out: Record<string, string | string[]> = {}
  for (const entry of parsed) {
    if (!Array.isArray(entry) || entry.length < 2) continue
    const [nameRaw, valueRaw] = entry
    if (typeof nameRaw !== 'string' || typeof valueRaw !== 'string') continue
    const name = nameRaw.toLowerCase()
    const existing = out[name]
    if (existing === undefined) {
      out[name] = valueRaw
    } else if (Array.isArray(existing)) {
      existing.push(valueRaw)
    } else {
      out[name] = [existing, valueRaw]
    }
  }
  return out
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
