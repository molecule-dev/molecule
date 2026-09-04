/**
 * RevenueCat webhook authentication primitives — the shared-`Authorization`
 * header check and the HMAC-SHA256 signature check.
 *
 * @remarks
 * Uses ONLY Node's built-in `node:crypto` (no new dependency):
 * `createHmac` for the digest and `timingSafeEqual` for every comparison, so
 * neither the configured header value nor a valid signature can be recovered
 * one byte at a time from response timing.
 *
 * @see https://www.revenuecat.com/docs/integrations/webhooks
 *
 * @module
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

/** The header RevenueCat puts its HMAC signature in when HMAC signing is enabled. */
export const REVENUECAT_SIGNATURE_HEADER = 'x-revenuecat-webhook-signature'

/** Default maximum age, in seconds, of a signed webhook before it is treated as a replay. */
export const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 300

/**
 * Compares two strings in constant time.
 *
 * `timingSafeEqual` throws on a length mismatch, which would itself leak the
 * expected length, so both sides are hashed to a fixed-width digest first.
 *
 * @param a - The first string.
 * @param b - The second string.
 * @returns `true` when the strings are byte-identical.
 */
export const constantTimeEquals = (a: string, b: string): boolean => {
  const digestA = createHmac('sha256', 'molecule-compare').update(a).digest()
  const digestB = createHmac('sha256', 'molecule-compare').update(b).digest()
  return timingSafeEqual(digestA, digestB)
}

/**
 * The parsed parts of an `X-RevenueCat-Webhook-Signature` header
 * (`t=<unix_timestamp>,v1=<hmac_sha256_hex>`).
 */
export interface ParsedSignatureHeader {
  /** The Unix timestamp (seconds) RevenueCat signed the request at. */
  timestamp: string
  /** The hex-encoded HMAC-SHA256 digest. */
  signature: string
}

/**
 * Parses an `X-RevenueCat-Webhook-Signature` header value.
 *
 * @param header - The raw header value, e.g. `t=1700000000,v1=abc123…`.
 * @returns The parsed `t` and `v1` parts, or `null` when either is missing or the header is malformed.
 */
export const parseSignatureHeader = (header: string): ParsedSignatureHeader | null => {
  const parts: Record<string, string> = {}
  for (const segment of header.split(',')) {
    const index = segment.indexOf('=')
    if (index <= 0) continue
    parts[segment.slice(0, index).trim()] = segment.slice(index + 1).trim()
  }

  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return null

  return { timestamp, signature }
}

/**
 * Verifies a RevenueCat webhook's HMAC-SHA256 signature.
 *
 * FAILS CLOSED — returns `false` (never throws, never "assume valid") when:
 * - the header is malformed or missing its `t` / `v1` parts
 * - the recomputed digest does not equal `v1`
 * - `t` is further from now than `toleranceSeconds` (replay window)
 *
 * @param rawBody - The raw request body EXACTLY as received. Re-serializing a parsed object (`JSON.parse` → `JSON.stringify`) changes the bytes and fails verification on valid requests — Express needs `express.raw()` (or a `rawBody` capture in its json verify hook).
 * @param header - The `X-RevenueCat-Webhook-Signature` header value.
 * @param secret - The webhook integration's HMAC signing secret.
 * @param toleranceSeconds - Maximum accepted age of the signature, in seconds. Defaults to 300. RevenueCat re-signs every retry, so this only needs to cover clock skew and request latency — never the 5/10/20/40/80-minute retry delays.
 * @param now - Current time in milliseconds since the epoch; injectable for tests.
 * @returns `true` only when the signature is authentic and inside the replay window.
 */
export const verifyWebhookSignature = (
  rawBody: string | Buffer,
  header: string,
  secret: string,
  toleranceSeconds: number = DEFAULT_SIGNATURE_TOLERANCE_SECONDS,
  now: number = Date.now(),
): boolean => {
  const parsed = parseSignatureHeader(header)
  if (!parsed) return false

  const timestampSeconds = Number(parsed.timestamp)
  if (!Number.isFinite(timestampSeconds)) return false

  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody
  const expected = createHmac('sha256', secret)
    .update(Buffer.concat([Buffer.from(`${parsed.timestamp}.`, 'utf8'), body]))
    .digest('hex')

  if (!constantTimeEquals(expected, parsed.signature)) return false

  // Check freshness only AFTER the digest matches, so an unauthenticated caller
  // cannot use the timestamp check to probe anything.
  return Math.abs(now / 1000 - timestampSeconds) <= toleranceSeconds
}

/**
 * Verifies the shared `Authorization` header RevenueCat sends when one is
 * configured on the webhook integration.
 *
 * @param header - The `Authorization` header value from the request, if any.
 * @param expected - The value configured on the RevenueCat webhook integration.
 * @returns `true` only when the header is present and byte-identical to `expected`.
 */
export const verifyWebhookAuthorization = (
  header: string | undefined,
  expected: string,
): boolean => {
  if (!header) return false
  return constantTimeEquals(header, expected)
}
