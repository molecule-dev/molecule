/**
 * Cryptographically-secure password generation utilities.
 *
 * All randomness comes from `crypto.getRandomValues` — never
 * `Math.random`. Rejection sampling is used to pick uniform indices
 * into the alphabet, eliminating modulo bias.
 *
 * @module
 */

import type { PasswordCharsetOptions } from './types.js'

/** Glyphs that read identically (or nearly so) in most fonts. */
const SIMILAR_CHARS = new Set(['0', 'O', 'o', '1', 'l', 'I'])

/**
 * Specials that are easy to mistype, get eaten by shells, or look the
 * same as ordinary punctuation. Drop these when `noAmbiguous` is on.
 */
const AMBIGUOUS_CHARS = new Set([' ', "'", '"', '`', '~'])

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>/?'

/** Default charset settings. */
export const DEFAULT_CHARSET: PasswordCharsetOptions = {
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  noSimilar: false,
  noAmbiguous: false,
}

/** Minimum / maximum allowed length for the slider. */
export const MIN_LENGTH = 8
/**
 *
 */
export const MAX_LENGTH = 64

/**
 * Clamp `n` into the `[MIN_LENGTH, MAX_LENGTH]` range.
 * @param n
 */
export function clampLength(n: number): number {
  if (!Number.isFinite(n)) return MIN_LENGTH
  return Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.floor(n)))
}

/**
 * Build the character pool for the supplied charset settings. If every
 * inclusion toggle is off, falls back to lowercase + digits so the
 * generator never has an empty alphabet to draw from.
 *
 * @param charset - Charset toggles.
 * @returns Concatenated allowed-character pool, deduplicated.
 */
export function buildCharset(charset: PasswordCharsetOptions): string {
  let raw = ''
  if (charset.uppercase) raw += UPPERCASE
  if (charset.lowercase) raw += LOWERCASE
  if (charset.digits) raw += DIGITS
  if (charset.symbols) raw += SYMBOLS
  if (raw.length === 0) raw = LOWERCASE + DIGITS

  let filtered = raw
  if (charset.noSimilar) {
    filtered = [...filtered].filter((c) => !SIMILAR_CHARS.has(c)).join('')
  }
  if (charset.noAmbiguous) {
    filtered = [...filtered].filter((c) => !AMBIGUOUS_CHARS.has(c)).join('')
  }
  if (filtered.length === 0) {
    // Defensive — both filters wiped everything; fall back to digits.
    filtered = DIGITS
  }
  // Dedupe.
  return [...new Set(filtered)].join('')
}

/**
 * Pull cryptographically-secure random unsigned 32-bit integers.
 * Wraps `crypto.getRandomValues` so callers can't accidentally route
 * through `Math.random`.
 *
 * @param count - Number of `Uint32` values to fill.
 * @returns A `Uint32Array` of `count` cryptographically-random values.
 */
function secureRandomUint32s(count: number): Uint32Array {
  const out = new Uint32Array(count)
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.getRandomValues) {
    throw new Error('crypto.getRandomValues unavailable; cannot generate secure password')
  }
  globalThis.crypto.getRandomValues(out)
  return out
}

/**
 * Generate one cryptographically-secure password of the requested
 * length using the supplied charset.
 *
 * Uses rejection sampling on each 32-bit integer to avoid modulo bias —
 * any value above `floor(2^32 / pool) * pool` is discarded and
 * resampled.
 *
 * @param length - Password length. Clamped to `[8, 64]`.
 * @param charset - Charset toggles.
 * @returns A freshly-generated password.
 */
export function generatePassword(length: number, charset: PasswordCharsetOptions): string {
  const len = clampLength(length)
  const pool = buildCharset(charset)
  const poolLen = pool.length
  const max = Math.floor(0x100000000 / poolLen) * poolLen

  let result = ''
  // Pull batches of randoms; each batch must satisfy `len` characters
  // after rejection-sampling out modulo-biased values. Pulling a
  // healthy oversize batch keeps amortized cost low.
  while (result.length < len) {
    const need = len - result.length
    const batch = secureRandomUint32s(Math.max(need * 2, 16))
    for (let i = 0; i < batch.length && result.length < len; i++) {
      const v = batch[i] as number
      if (v >= max) continue
      result += pool.charAt(v % poolLen)
    }
  }
  return result
}
