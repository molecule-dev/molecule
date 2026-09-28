/**
 * Query keys as strings, so bonds can store and compare them by value.
 *
 * @module
 */

import type { QueryKey } from './types.js'

/**
 * A stable string for a key: object parts are serialized with their entries
 * sorted, so `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` hash the same; `undefined`
 * parts hash as `null`.
 *
 * @param key - The key.
 * @returns Its string form.
 */
export function hashQueryKey(key: QueryKey): string {
  return JSON.stringify(key, (_k, value: unknown) => {
    if (value === undefined) return null
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {}
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k]
      }
      return sorted
    }
    return value
  })
}

/**
 * Whether `key` starts with every part of `prefix` (compared by value).
 *
 * @param key - The longer key.
 * @param prefix - The shorter key.
 * @returns `true` when `prefix` prefixes `key` (a key prefixes itself).
 */
export function keyStartsWith(key: QueryKey, prefix: QueryKey): boolean {
  if (prefix.length > key.length) return false
  for (let i = 0; i < prefix.length; i++) {
    if (hashQueryKey([key[i]]) !== hashQueryKey([prefix[i]])) return false
  }
  return true
}
