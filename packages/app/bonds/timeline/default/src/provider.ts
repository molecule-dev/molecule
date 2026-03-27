/**
 * Default implementation of TimelineProvider.
 *
 * @module
 */

import type { DefaultConfig } from './types.js'

/**
 *
 */
export class DefaultTimelineProvider {
  readonly name = 'default'

  constructor(private config: DefaultConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DefaultConfig): DefaultTimelineProvider {
  return new DefaultTimelineProvider(config)
}
