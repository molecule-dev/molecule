/**
 * Geolocation provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { GeolocationProvider } from './types.js'

let _provider: GeolocationProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: GeolocationProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): GeolocationProvider | null {
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
export function requireProvider(): GeolocationProvider {
  if (!_provider) {
    throw new Error('Geolocation provider not configured. Bond a geolocation provider first.')
  }
  return _provider
}
