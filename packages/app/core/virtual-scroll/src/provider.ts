/**
 * VirtualScroll provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { VirtualScrollProvider } from './types.js'

let _provider: VirtualScrollProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: VirtualScrollProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): VirtualScrollProvider | null {
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
export function requireProvider(): VirtualScrollProvider {
  if (!_provider) {
    throw new Error('VirtualScroll provider not configured. Bond a virtual-scroll provider first.')
  }
  return _provider
}
