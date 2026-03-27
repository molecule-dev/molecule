/**
 * TreeView provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { TreeViewProvider } from './types.js'

let _provider: TreeViewProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: TreeViewProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): TreeViewProvider | null {
  return _provider
}

/**
 *
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 *
 */
export function requireProvider(): TreeViewProvider {
  if (!_provider) {
    throw new Error('TreeView provider not configured. Bond a tree-view provider first.')
  }
  return _provider
}
