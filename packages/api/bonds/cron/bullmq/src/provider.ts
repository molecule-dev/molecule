/**
 * Bullmq implementation of CronProvider.
 *
 * @module
 */

import type { BullmqConfig } from './types.js'

/**
 *
 */
export class BullmqCronProvider {
  readonly name = 'bullmq'

  constructor(private config: BullmqConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: BullmqConfig): BullmqCronProvider {
  return new BullmqCronProvider(config)
}
