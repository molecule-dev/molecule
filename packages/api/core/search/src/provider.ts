/**
 * Search provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { SearchProvider } from './types.js'

let _provider: SearchProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: SearchProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): SearchProvider | null {
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
export function requireProvider(): SearchProvider {
  if (!_provider) {
    throw new Error('Search provider not configured. Bond a search provider first.')
  }
  return _provider
}
