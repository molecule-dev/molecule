/**
 * Permissions provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { PermissionsProvider } from './types.js'

let _provider: PermissionsProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: PermissionsProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): PermissionsProvider | null {
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
export function requireProvider(): PermissionsProvider {
  if (!_provider) {
    throw new Error('Permissions provider not configured. Bond a permissions provider first.')
  }
  return _provider
}
