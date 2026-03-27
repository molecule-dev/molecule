/**
 * Realtime provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { RealtimeProvider } from './types.js'

let _provider: RealtimeProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: RealtimeProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): RealtimeProvider | null {
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
export function requireProvider(): RealtimeProvider {
  if (!_provider) {
    throw new Error('Realtime provider not configured. Bond a realtime provider first.')
  }
  return _provider
}
