/**
 * File upload provider singleton.
 *
 * Bond packages call {@link setProvider} during application startup.
 * Application code calls {@link getProvider} or {@link createUploader} at runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type { FileUploadInstance, FileUploadOptions, FileUploadProvider } from './types.js'

/** Bond category key for the file upload provider. */
const BOND_TYPE = 'file-upload'

/**
 * Registers a file upload provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/app-file-upload-filepond`) during app startup.
 *
 * @param provider - The file upload provider implementation to bond.
 */
export function setProvider(provider: FileUploadProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded file upload provider, throwing if none is configured.
 *
 * @returns The bonded file upload provider.
 * @throws {Error} If no file upload provider has been bonded.
 */
export function getProvider(): FileUploadProvider {
  const provider = bondGet<FileUploadProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      '@molecule/app-file-upload: No provider bonded. Call setProvider() with a file upload bond (e.g. @molecule/app-file-upload-filepond).',
    )
  }
  return provider
}

/**
 * Checks whether a file upload provider is currently bonded.
 *
 * @returns `true` if a file upload provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a new file upload instance using the bonded provider.
 *
 * @param options - Upload configuration including destination, validation, and events.
 * @returns A file upload instance for managing queued files and uploads.
 * @throws {Error} If no file upload provider has been bonded.
 */
export function createUploader(options: FileUploadOptions): FileUploadInstance {
  return getProvider().createUploader(options)
}
