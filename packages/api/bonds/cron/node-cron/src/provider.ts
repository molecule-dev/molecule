/**
 * Cron implementation of CronProvider.
 *
 * @module
 */

import type { CronConfig } from './types.js'

/**
 *
 */
export class CronCronProvider {
  readonly name = 'cron'

  constructor(private config: CronConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: CronConfig): CronCronProvider {
  return new CronCronProvider(config)
}
