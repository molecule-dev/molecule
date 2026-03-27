/**
 * MultiTenancy provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { MultiTenancyProvider } from './types.js'

let _provider: MultiTenancyProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: MultiTenancyProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): MultiTenancyProvider | null {
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
export function requireProvider(): MultiTenancyProvider {
  if (!_provider) {
    throw new Error('MultiTenancy provider not configured. Bond a multi-tenancy provider first.')
  }
  return _provider
}
