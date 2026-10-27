/**
 * Paracrine bond accessors.
 *
 * The paracrine store is bonded as the SINGLETON of its category: a machine
 * (or a project) has one mailbox tree, and "which store" is deployment
 * configuration the way the dev-sandbox slot is — a named second store can
 * still be bonded beside it if a platform ever runs two.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/api-bond'

import type { ParacrineProvider } from './types.js'

/** The bond category paracrine stores are registered under. */
export const PARACRINE_BOND_TYPE = 'paracrine'

/**
 * Register the machine's paracrine store.
 *
 * @param provider - The store.
 */
export function setProvider(provider: ParacrineProvider): void {
  bond(PARACRINE_BOND_TYPE, provider)
}

/**
 * The bonded paracrine store, or `null`.
 *
 * @returns The store, or `null` when none is bonded.
 */
export function getProvider(): ParacrineProvider | null {
  return bondGet<ParacrineProvider>(PARACRINE_BOND_TYPE) ?? null
}

/**
 * Whether a paracrine store is bonded.
 *
 * @returns `true` when one is.
 */
export function hasProvider(): boolean {
  return isBonded(PARACRINE_BOND_TYPE)
}

/**
 * The bonded paracrine store.
 *
 * @returns The store.
 * @throws {Error} When none is bonded — never falls back to a guessed store,
 *   because a message that silently lands where nobody reads it is worse than
 *   a sender that fails to find a mailbox.
 */
export function requireProvider(): ParacrineProvider {
  const provider = getProvider()
  if (!provider) {
    throw new Error(
      'No paracrine store is bonded. Bond one with setProvider(provider) — ' +
        '@molecule/api-paracrine-file is the zero-config local one.',
    )
  }
  return provider
}
