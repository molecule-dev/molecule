/**
 * FileUpload provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { FileUploadProvider } from './types.js'

let _provider: FileUploadProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: FileUploadProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): FileUploadProvider | null {
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
export function requireProvider(): FileUploadProvider {
  if (!_provider) {
    throw new Error('FileUpload provider not configured. Bond a file-upload provider first.')
  }
  return _provider
}
