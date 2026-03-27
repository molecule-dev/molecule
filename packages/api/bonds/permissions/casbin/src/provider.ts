/**
 * Casbin implementation of PermissionsProvider.
 *
 * @module
 */

import type { CasbinConfig } from './types.js'

/**
 *
 */
export class CasbinPermissionsProvider {
  readonly name = 'casbin'

  constructor(private config: CasbinConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: CasbinConfig): CasbinPermissionsProvider {
  return new CasbinPermissionsProvider(config)
}
