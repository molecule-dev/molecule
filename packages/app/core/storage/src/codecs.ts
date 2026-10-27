/**
 * Reusable value codecs for provider bonds.
 *
 * A codec decides how ONE key's value becomes the raw string a synchronous
 * backend holds and how that string becomes a value again. The string codec here
 * exists for compatibility: an app whose PREVIOUS storage helper wrote values
 * verbatim (a prompt, a conversation id, a project id) can declare those keys as
 * strings, so the values written before the switch are read back unchanged
 * instead of being reset by a JSON parser.
 *
 * @module
 */

import type { StorageCodec } from './types.js'

/**
 * Which keys a codec owns: one exact key, or a predicate over the key.
 */
export type StorageCodecMatch = string | ((key: string) => boolean)

/**
 * Creates a codec for keys whose value is a plain string.
 *
 * Decoding accepts BOTH shapes that exist in the wild for such a key:
 *
 * - the JSON string this codec writes (`"build me a thing"`), and
 * - the verbatim text an older storage helper wrote (`build me a thing`).
 *
 * So a value persisted before the switch is read back rather than reset, and a
 * value written now stays readable by either shape. A legacy text that happens
 * to BE valid JSON is decoded as the JSON value it is (a bare `42` stays the
 * string `"42"`, a quoted `"hi"` reads as `hi`), which is the only reading that
 * keeps both shapes consistent.
 *
 * Use it only for keys that hold plain strings: a key that holds structured data
 * belongs on the provider's JSON codec, where a corrupt entry still reads as
 * absent.
 * @param match - The exact key, or a predicate receiving the unprefixed key.
 * @returns A codec owning those keys.
 */
export function createStringCodec(match: StorageCodecMatch): StorageCodec {
  const matches = typeof match === 'function' ? match : (key: string): boolean => key === match
  return {
    matches,
    encode: (value: unknown): string => JSON.stringify(String(value)),
    decode: (raw: string): unknown => {
      try {
        const parsed: unknown = JSON.parse(raw)
        // A JSON string is the shape this codec writes; anything else is the
        // verbatim text an earlier helper wrote (or a number it stringified).
        return typeof parsed === 'string' ? parsed : raw
      } catch (_error) {
        // Not JSON at all: a value the previous helper wrote verbatim.
        return raw
      }
    },
  }
}
