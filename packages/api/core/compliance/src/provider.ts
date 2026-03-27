/**
 * Compliance provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { ComplianceProvider } from './types.js'

let _provider: ComplianceProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: ComplianceProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): ComplianceProvider | null {
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
export function requireProvider(): ComplianceProvider {
  if (!_provider) {
    throw new Error('Compliance provider not configured. Bond a compliance provider first.')
  }
  return _provider
}
