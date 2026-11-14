/**
 * Bond-slot bookkeeping shared by the area fakes.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

/**
 * Saves a set of bond slots and returns a function restoring each to its
 * previous provider — or to "no provider" (`bond(type, null)`) when it had
 * none, so an auto-created default keeps being auto-created after the case.
 * Call BEFORE bonding the fake.
 *
 * @param types - The bond category strings ('device', 'push', …).
 * @returns The restore function for `dispose`.
 */
export function saveBonds(types: readonly string[]): () => void {
  const saved = types.map((type) => ({
    type,
    had: isBonded(type),
    provider: bondGet<unknown>(type),
  }))
  return () => {
    for (const { type, had, provider } of saved) bond(type, had ? provider : null)
  }
}
