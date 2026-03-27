/**
 * Aes implementation of EncryptionProvider.
 *
 * @module
 */

import type { AesConfig } from './types.js'

/**
 *
 */
export class AesEncryptionProvider {
  readonly name = 'aes'

  constructor(private config: AesConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: AesConfig): AesEncryptionProvider {
  return new AesEncryptionProvider(config)
}
