/**
 * Queue implementation of WebhookProvider.
 *
 * @module
 */

import type { QueueConfig } from './types.js'

/**
 *
 */
export class QueueWebhookProvider {
  readonly name = 'queue'

  constructor(private config: QueueConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: QueueConfig): QueueWebhookProvider {
  return new QueueWebhookProvider(config)
}
