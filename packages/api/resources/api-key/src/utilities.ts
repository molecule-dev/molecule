/**
 * Internal helpers for hashing, masking, and constant-time comparison
 * of API keys.
 *
 * @module
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/** Default token prefix when one isn't supplied. */
export const DEFAULT_PREFIX = 'sk_'

/** Number of random bytes that back each plaintext token (256 bits). */
export const PLAINTEXT_BYTES = 32

/** Number of trailing plaintext characters to surface in the masked display. */
export const MASKED_TAIL_LENGTH = 4

/**
 * Generate a cryptographically random plaintext API token.
 *
 * The returned string has the form `<prefix><base64url>`, where
 * `<base64url>` is {@link PLAINTEXT_BYTES} random bytes encoded
 * url-safely. Callers must treat the result as a secret — it is the
 * only chance to surface the plaintext to a user.
 *
 * @param prefix - Optional token prefix (e.g. `'sk_live_'`). Defaults to {@link DEFAULT_PREFIX}.
 * @returns The newly generated plaintext token.
 */
export const generatePlaintextToken = (prefix: string = DEFAULT_PREFIX): string => {
  const random = randomBytes(PLAINTEXT_BYTES).toString('base64url')
  return `${prefix}${random}`
}

/**
 * SHA-256-hash a plaintext token. Deterministic for a given input.
 *
 * @param plaintext - The plaintext token to hash.
 * @returns Hex-encoded SHA-256 digest.
 */
export const hashPlaintextToken = (plaintext: string): string => {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex')
}

/**
 * Build a UI-safe display string of the form `<prefix>…<last4>`.
 *
 * The middle of the token is replaced with an ellipsis; only the
 * configured prefix and last {@link MASKED_TAIL_LENGTH} characters
 * are kept.
 *
 * @param plaintext - The plaintext token.
 * @param prefix - Optional prefix override. When omitted, the function infers it
 *                 from the leading `<word>_` segment of `plaintext`, falling back
 *                 to {@link DEFAULT_PREFIX}.
 * @returns The masked display string.
 */
export const maskPlaintextToken = (plaintext: string, prefix?: string): string => {
  const resolvedPrefix = prefix ?? inferPrefix(plaintext)
  const tail = plaintext.slice(-MASKED_TAIL_LENGTH)
  return `${resolvedPrefix}…${tail}`
}

/**
 * Constant-time compare of two strings of arbitrary length.
 *
 * Uses {@link timingSafeEqual} — when the lengths differ, falsifies
 * after a same-shape compare so the runtime does not leak length
 * information to an attacker.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns True iff `a` and `b` are byte-identical.
 */
export const constantTimeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  // Equalize lengths to keep the comparison branchless on length.
  const length = Math.max(bufA.length, bufB.length)
  const padA = Buffer.alloc(length)
  const padB = Buffer.alloc(length)
  bufA.copy(padA)
  bufB.copy(padB)
  const equal = timingSafeEqual(padA, padB)
  return equal && bufA.length === bufB.length
}

const inferPrefix = (plaintext: string): string => {
  // Recognize prefixes of the form `<lower>(_<lower>)*_` — e.g. `sk_`,
  // `sk_live_`, `pat_test_`. Avoids mis-inferring when the random tail
  // (base64url) happens to contain underscores.
  const match = plaintext.match(/^([a-z]+(?:_[a-z]+)*_)/)
  return match ? match[1] : DEFAULT_PREFIX
}
