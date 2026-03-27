/**
 * Mjml implementation of TemplatingProvider.
 *
 * @module
 */

import type { MjmlConfig } from './types.js'

/**
 *
 */
export class MjmlTemplatingProvider {
  readonly name = 'mjml'

  constructor(private config: MjmlConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: MjmlConfig): MjmlTemplatingProvider {
  return new MjmlTemplatingProvider(config)
}
