/**
 * HTTP implementation of WebhookProvider.
 *
 * @module
 */

import type { HTTPConfig } from './types.js'

/**
 *
 */
export class HTTPWebhookProvider {
  readonly name = 'http'

  constructor(private config: HTTPConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: HTTPConfig): HTTPWebhookProvider {
  return new HTTPWebhookProvider(config)
}
