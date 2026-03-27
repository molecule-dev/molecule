/**
 * Handlebars implementation of TemplatingProvider.
 *
 * @module
 */

import type { HandlebarsConfig } from './types.js'

/**
 *
 */
export class HandlebarsTemplatingProvider {
  readonly name = 'handlebars'

  constructor(private config: HandlebarsConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: HandlebarsConfig): HandlebarsTemplatingProvider {
  return new HandlebarsTemplatingProvider(config)
}
