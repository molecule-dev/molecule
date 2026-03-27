/**
 * Default implementation of TreeProvider.
 *
 * @module
 */

import type { DefaultConfig } from './types.js'

/**
 *
 */
export class DefaultTreeProvider {
  readonly name = 'default'

  constructor(private config: DefaultConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DefaultConfig): DefaultTreeProvider {
  return new DefaultTreeProvider(config)
}
