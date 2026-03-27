/**
 * DataTable provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { DataTableProvider } from './types.js'

let _provider: DataTableProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: DataTableProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): DataTableProvider | null {
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
export function requireProvider(): DataTableProvider {
  if (!_provider) {
    throw new Error('DataTable provider not configured. Bond a data-table provider first.')
  }
  return _provider
}
