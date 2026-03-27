/**
 * ImportExport provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { ImportExportProvider } from './types.js'

let _provider: ImportExportProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: ImportExportProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): ImportExportProvider | null {
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
export function requireProvider(): ImportExportProvider {
  if (!_provider) {
    throw new Error('ImportExport provider not configured. Bond a import-export provider first.')
  }
  return _provider
}
