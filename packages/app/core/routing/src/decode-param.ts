/**
 * Decoding of matched route params, shared by the router and URL-backed lists. Internal:
 * not exported from the package entry.
 *
 * @module
 */

import type { RouteParams } from './types.js'

/**
 * Decodes a matched param. A malformed escape stays a usable literal, as React Router keeps it.
 *
 * @param value - The still-encoded param.
 * @returns The decoded value.
 */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch (_error) {
    // A malformed incoming URL is still a usable literal; do not crash the page.
    return value
  }
}

/**
 * Decodes every param of a match on the raw pathname, as a native router hands them out
 * (React Router's `useParams`, Vue Router's `route.params`).
 *
 * @param params - The still-encoded params.
 * @returns The decoded params.
 */
export function decodeParams<T extends RouteParams>(params: T): T {
  const decoded: RouteParams = {}
  for (const [key, value] of Object.entries(params)) decoded[key] = decodeParam(value)
  return decoded as T
}
