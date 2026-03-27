/**
 * Generic implementation of OauthProvider.
 *
 * @module
 */

import type { GenericConfig } from './types.js'

/**
 *
 */
export class GenericOauthProvider {
  readonly name = 'generic'

  constructor(private config: GenericConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: GenericConfig): GenericOauthProvider {
  return new GenericOauthProvider(config)
}
