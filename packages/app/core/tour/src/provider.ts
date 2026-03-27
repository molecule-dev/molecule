/**
 * Tour provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { TourProvider } from './types.js'

let _provider: TourProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: TourProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): TourProvider | null {
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
export function requireProvider(): TourProvider {
  if (!_provider) {
    throw new Error('Tour provider not configured. Bond a tour provider first.')
  }
  return _provider
}
