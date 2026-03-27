/**
 * File implementation of AuditProvider.
 *
 * @module
 */

import type { FileConfig } from './types.js'

/**
 *
 */
export class FileAuditProvider {
  readonly name = 'file'

  constructor(private config: FileConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: FileConfig): FileAuditProvider {
  return new FileAuditProvider(config)
}
