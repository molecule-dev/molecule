/**
 * Tree view provider singleton.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import type { TreeViewProvider } from './types.js'

let _provider: TreeViewProvider | null = null

/**
 * Registers a tree view provider as the active singleton.
 *
 * @param provider - The tree view provider implementation to bond.
 */
export function setProvider(provider: TreeViewProvider): void {
  _provider = provider
}

/**
 * Retrieves the bonded tree view provider, or `null` if none is bonded.
 *
 * @returns The active tree view provider, or `null`.
 */
export function getProvider(): TreeViewProvider | null {
  return _provider
}

/**
 * Checks whether a tree view provider has been bonded.
 *
 * @returns `true` if a tree view provider is available.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Retrieves the bonded tree view provider, throwing if none is configured.
 *
 * @returns The active tree view provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): TreeViewProvider {
  if (!_provider) {
    throw new Error('TreeView provider not configured. Bond a tree-view provider first.')
  }
  return _provider
}
