/**
 * Default implementation of NotificationProvider.
 *
 * @module
 */

import type { DefaultConfig } from './types.js'

/**
 *
 */
export class DefaultNotificationProvider {
  readonly name = 'default'

  constructor(private config: DefaultConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DefaultConfig): DefaultNotificationProvider {
  return new DefaultNotificationProvider(config)
}
