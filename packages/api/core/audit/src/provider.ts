/**
 * Audit provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AuditProvider } from './types.js'

let _provider: AuditProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: AuditProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AuditProvider | null {
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
export function requireProvider(): AuditProvider {
  if (!_provider) {
    throw new Error('Audit provider not configured. Bond a audit provider first.')
  }
  return _provider
}
