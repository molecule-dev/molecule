/**
 * Cmdk implementation of CommandProvider.
 *
 * @module
 */

import type { CmdkConfig } from './types.js'

/**
 *
 */
export class CmdkCommandProvider {
  readonly name = 'cmdk'

  constructor(private config: CmdkConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: CmdkConfig): CmdkCommandProvider {
  return new CmdkCommandProvider(config)
}
