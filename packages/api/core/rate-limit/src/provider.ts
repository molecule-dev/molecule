/**
 * RateLimit provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { RateLimitProvider } from './types.js'

let _provider: RateLimitProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: RateLimitProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): RateLimitProvider | null {
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
export function requireProvider(): RateLimitProvider {
  if (!_provider) {
    throw new Error('RateLimit provider not configured. Bond a rate-limit provider first.')
  }
  return _provider
}
