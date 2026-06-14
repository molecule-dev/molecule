/**
 * Browser `localStorage` adapter for workspace-layout persistence.
 *
 * The provider stays storage-agnostic (it accepts an injectable
 * {@link StorageAdapter} and defaults to in-memory). This helper supplies the
 * concrete browser implementation used to pre-wire the exported singleton so a
 * resized layout survives a page reload out of the box, while remaining `null`
 * (in-memory, no persistence) anywhere `localStorage` is missing or blocked
 * (SSR, Node test runners, privacy modes that throw on access).
 *
 * @module
 */

import type { StorageAdapter } from './types.js'

/**
 * Returns a {@link StorageAdapter} backed by the browser's `localStorage`, or
 * `null` when no usable `localStorage` exists. A `null` result means
 * "persistence unavailable — fall back to in-memory".
 * @returns A `localStorage`-backed adapter, or `null` if unavailable.
 */
export function getBrowserStorage(): StorageAdapter | null {
  try {
    const ls = globalThis.localStorage as Storage | undefined
    if (!ls) return null
    // Some environments expose the object but throw on first use (private mode,
    // disabled storage). Probe with a throwaway key before trusting it.
    const probeKey = '__molecule_workspace_probe__'
    ls.setItem(probeKey, probeKey)
    ls.removeItem(probeKey)
    return {
      getItem: (key: string) => ls.getItem(key),
      setItem: (key: string, value: string) => ls.setItem(key, value),
      removeItem: (key: string) => ls.removeItem(key),
    }
  } catch (_error) {
    // localStorage is absent or access is blocked. Layout persistence across
    // reloads is an enhancement, not a requirement, so fall back to in-memory.
    return null
  }
}
