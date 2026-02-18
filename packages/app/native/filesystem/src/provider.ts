/**
 * Filesystem provider management for molecule.dev.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'
import { t } from '@molecule/app-i18n'

import type {
  CopyOptions,
  DeleteOptions,
  Directory,
  FileInfo,
  FilesystemCapabilities,
  FilesystemProvider,
  ListOptions,
  ReadOptions,
  StatOptions,
  WriteOptions,
} from './types.js'

const BOND_TYPE = 'filesystem'

/**
 * Set the filesystem provider.
 * @param provider - FilesystemProvider implementation to register.
 */
export function setProvider(provider: FilesystemProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the current filesystem provider.
 * @throws {Error} If no provider has been set via setProvider.
 * @returns The active FilesystemProvider instance.
 */
export function getProvider(): FilesystemProvider {
  const provider = bondGet<FilesystemProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      t('filesystem.error.noProvider', undefined, {
        defaultValue:
          '@molecule/app-filesystem: No provider set. Call setProvider() with a FilesystemProvider implementation (e.g., from @molecule/app-filesystem-capacitor).',
      }),
    )
  }
  return provider
}

/**
 * Check if a filesystem provider has been registered.
 * @returns Whether a FilesystemProvider has been bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Read a file as text.
 * @param path - The file path to read.
 * @param options - Read options (directory, encoding).
 * @returns The file contents as a string.
 */
export async function readFile(path: string, options?: ReadOptions): Promise<string> {
  return getProvider().readFile(path, options)
}

/**
 * Read a file as binary data.
 * @param path - The file path to read.
 * @param options - Read options (directory).
 * @returns The file contents as a Blob.
 */
export async function readFileAsBlob(
  path: string,
  options?: Omit<ReadOptions, 'encoding'>,
): Promise<Blob> {
  return getProvider().readFileAsBlob(path, options)
}

/**
 * Write text content to a file.
 * @param path - The file path to write to.
 * @param data - The text content to write.
 * @param options - Write options (directory, encoding, recursive, append).
 * @returns A promise that resolves when the file is written.
 */
export async function writeFile(path: string, data: string, options?: WriteOptions): Promise<void> {
  return getProvider().writeFile(path, data, options)
}

/**
 * Write binary data to a file.
 * @param path - The file path to write to.
 * @param data - The binary data to write as a Blob.
 * @param options - Write options (directory, recursive).
 * @returns A promise that resolves when the file is written.
 */
export async function writeFileFromBlob(
  path: string,
  data: Blob,
  options?: Omit<WriteOptions, 'encoding'>,
): Promise<void> {
  return getProvider().writeFileFromBlob(path, data, options)
}

/**
 * Append text content to a file.
 * @param path - The file path to append to.
 * @param data - The text content to append.
 * @param options - Write options (directory, encoding).
 * @returns A promise that resolves when the data is appended.
 */
export async function appendFile(
  path: string,
  data: string,
  options?: WriteOptions,
): Promise<void> {
  return getProvider().appendFile(path, data, options)
}

/**
 * Delete a file.
 * @param path - The file path to delete.
 * @param options - Delete options (directory, recursive).
 * @returns A promise that resolves when the file is deleted.
 */
export async function deleteFile(path: string, options?: DeleteOptions): Promise<void> {
  return getProvider().deleteFile(path, options)
}

/**
 * Create a directory.
 * @param path - The directory path to create.
 * @param options - Write options (directory, recursive for parent directories).
 * @returns A promise that resolves when the directory is created.
 */
export async function mkdir(path: string, options?: WriteOptions): Promise<void> {
  return getProvider().mkdir(path, options)
}

/**
 * Remove a directory.
 * @param path - The directory path to remove.
 * @param options - Delete options (directory, recursive for contents).
 * @returns A promise that resolves when the directory is removed.
 */
export async function rmdir(path: string, options?: DeleteOptions): Promise<void> {
  return getProvider().rmdir(path, options)
}

/**
 * List directory contents.
 * @param path - The directory path to list.
 * @param options - List options (directory, include hidden files).
 * @returns An array of FileInfo objects for each entry.
 */
export async function readdir(path: string, options?: ListOptions): Promise<FileInfo[]> {
  return getProvider().readdir(path, options)
}

/**
 * Get file or directory metadata.
 * @param path - The path to stat.
 * @param options - Stat options (directory).
 * @returns The FileInfo with size, dates, and type information.
 */
export async function stat(path: string, options?: StatOptions): Promise<FileInfo> {
  return getProvider().stat(path, options)
}

/**
 * Check if a file or directory exists.
 * @param path - The path to check.
 * @param options - Stat options (directory).
 * @returns Whether the path exists.
 */
export async function exists(path: string, options?: StatOptions): Promise<boolean> {
  return getProvider().exists(path, options)
}

/**
 * Copy a file to a new location.
 * @param from - The source file path.
 * @param to - The destination file path.
 * @param options - Copy options (source/dest directories, overwrite).
 * @returns A promise that resolves when the file is copied.
 */
export async function copy(from: string, to: string, options?: CopyOptions): Promise<void> {
  return getProvider().copy(from, to, options)
}

/**
 * Move or rename a file.
 * @param from - The source file path.
 * @param to - The destination file path.
 * @param options - Move options (source/dest directories, overwrite).
 * @returns A promise that resolves when the file is moved.
 */
export async function move(from: string, to: string, options?: CopyOptions): Promise<void> {
  return getProvider().move(from, to, options)
}

/**
 * Get the platform-specific URI for a file path.
 * @param path - The file path to resolve.
 * @param options - Stat options (directory).
 * @returns The file's platform URI string.
 */
export async function getUri(path: string, options?: StatOptions): Promise<string> {
  return getProvider().getUri(path, options)
}

/**
 * Get available storage space in bytes for a directory.
 * @param directory - The directory type to check (defaults to app data).
 * @returns The available space in bytes.
 */
export async function getAvailableSpace(directory?: Directory): Promise<number> {
  return getProvider().getAvailableSpace(directory)
}

/**
 * Get the platform's filesystem capabilities.
 * @returns The capabilities indicating available directories, picker support, and size limits.
 */
export async function getCapabilities(): Promise<FilesystemCapabilities> {
  return getProvider().getCapabilities()
}
