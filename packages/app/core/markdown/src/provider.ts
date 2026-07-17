/**
 * Markdown provider wiring.
 *
 * Delegates to the shared `@molecule/app-bond` registry under the `'markdown'`
 * category, so `setProvider(provider)` and `bond('markdown', provider)` write
 * the same slot — either bonds the provider. Bond packages call `setProvider()`
 * during setup; application code calls `getProvider()` / `requireProvider()` at
 * runtime.
 *
 * @module
 */

import { bond, get, isBonded } from '@molecule/app-bond'

import type { MarkdownProvider } from './types.js'

const BOND_TYPE = 'markdown'

/**
 * Registers a markdown provider as the active singleton.
 *
 * @param provider - The markdown provider implementation to bond.
 */
export function setProvider(provider: MarkdownProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded markdown provider, or `null` if none is bonded.
 *
 * @returns The active markdown provider, or `null`.
 */
export function getProvider(): MarkdownProvider | null {
  return get<MarkdownProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a markdown provider has been bonded.
 *
 * @returns `true` if a markdown provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded markdown provider, throwing if none is configured.
 *
 * @returns The active markdown provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): MarkdownProvider {
  const provider = get<MarkdownProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error('Markdown provider not configured. Bond a markdown provider first.')
  }
  return provider
}
