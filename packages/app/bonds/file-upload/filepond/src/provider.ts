/**
 * Filepond implementation of FileProvider.
 *
 * @module
 */

import type { FilepondConfig } from './types.js'

/**
 *
 */
export class FilepondFileProvider {
  readonly name = 'filepond'

  constructor(private config: FilepondConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: FilepondConfig): FilepondFileProvider {
  return new FilepondFileProvider(config)
}
