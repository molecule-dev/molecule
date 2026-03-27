/**
 * Sse implementation of RealtimeProvider.
 *
 * @module
 */

import type { SseConfig } from './types.js'

/**
 *
 */
export class SseRealtimeProvider {
  readonly name = 'sse'

  constructor(private config: SseConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: SseConfig): SseRealtimeProvider {
  return new SseRealtimeProvider(config)
}
