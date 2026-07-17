/**
 * Tree view provider wiring, backed by the shared `@molecule/app-bond` registry.
 *
 * Bond packages call `setProvider()` during setup; it delegates to
 * `bond('tree-view', provider)`, so wiring via this package's `setProvider()`
 * and via `bond('tree-view', …)` write the SAME registry slot — use either.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import { bond, get, isBonded, requireSingleton } from '@molecule/app-bond'

import type { TreeViewProvider } from './types.js'

const BOND_TYPE = 'tree-view'

/**
 * Registers a tree view provider as the active singleton.
 *
 * @param provider - The tree view provider implementation to bond.
 */
export function setProvider(provider: TreeViewProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded tree view provider, or `null` if none is bonded.
 *
 * @returns The active tree view provider, or `null`.
 */
export function getProvider(): TreeViewProvider | null {
  return get<TreeViewProvider>(BOND_TYPE) ?? null
}

/**
 * Checks whether a tree view provider has been bonded.
 *
 * @returns `true` if a tree view provider is available.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Retrieves the bonded tree view provider, throwing if none is configured.
 *
 * @returns The active tree view provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): TreeViewProvider {
  if (!isBonded(BOND_TYPE)) {
    throw new Error('TreeView provider not configured. Bond a tree-view provider first.')
  }
  return requireSingleton<TreeViewProvider>(BOND_TYPE)
}
