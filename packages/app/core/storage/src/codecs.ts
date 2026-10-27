/**
 * Reusable value codecs for provider bonds.
 *
 * A codec decides how ONE key's value becomes the raw string a synchronous
 * backend holds and how that string becomes a value again. The raw-string codec
 * here exists for compatibility: an app whose PREVIOUS storage helper wrote
 * values verbatim (a prompt, a conversation id, a project id) can declare those
 * keys as raw strings, so the values written before the switch are read back
 * unchanged instead of being reset by a JSON parser.
 *
 * @module
 */

import type { StorageCodec } from './types.js'

/**
 * Which keys a codec owns: one exact key, or a predicate over the key.
 */
export type StorageCodecMatch = string | ((key: string) => boolean)

/**
 * Creates a codec for keys whose value IS the raw string (no JSON encoding).
 *
 * Both directions are verbatim, so a value written by an older raw-string
 * helper — `localStorage.setItem(key, 'build me a thing')` — reads back as
 * exactly that string, and a value written through this codec reads back
 * verbatim on the next visit too. Use it only for keys that hold plain strings:
 * a key that holds structured data belongs on the provider's JSON codec.
 * @param match - The exact key, or a predicate receiving the unprefixed key.
 * @returns A codec encoding and decoding those keys as raw strings.
 */
export function createRawStringCodec(match: StorageCodecMatch): StorageCodec {
  const matches = typeof match === 'function' ? match : (key: string): boolean => key === match
  return {
    matches,
    encode: (value: unknown): string => String(value),
    decode: (raw: string): unknown => raw,
  }
}
