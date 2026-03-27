/**
 * Custom implementation of PermissionsProvider.
 *
 * @module
 */

import type { CustomConfig } from './types.js'

/**
 *
 */
export class CustomPermissionsProvider {
  readonly name = 'custom'

  constructor(private config: CustomConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: CustomConfig): CustomPermissionsProvider {
  return new CustomPermissionsProvider(config)
}
