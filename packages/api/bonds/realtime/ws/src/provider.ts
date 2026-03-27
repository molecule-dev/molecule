/**
 * Ws implementation of RealtimeProvider.
 *
 * @module
 */

import type { WsConfig } from './types.js'

/**
 *
 */
export class WsRealtimeProvider {
  readonly name = 'ws'

  constructor(private config: WsConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: WsConfig): WsRealtimeProvider {
  return new WsRealtimeProvider(config)
}
