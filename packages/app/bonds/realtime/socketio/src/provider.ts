/**
 * Socketio implementation of RealtimeProvider.
 *
 * @module
 */

import type { SocketioConfig } from './types.js'

/**
 *
 */
export class SocketioRealtimeProvider {
  readonly name = 'socketio'

  constructor(private config: SocketioConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: SocketioConfig): SocketioRealtimeProvider {
  return new SocketioRealtimeProvider(config)
}
