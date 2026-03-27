/**
 * Pdf provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { PdfProvider } from './types.js'

let _provider: PdfProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: PdfProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): PdfProvider | null {
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
export function requireProvider(): PdfProvider {
  if (!_provider) {
    throw new Error('Pdf provider not configured. Bond a pdf provider first.')
  }
  return _provider
}
