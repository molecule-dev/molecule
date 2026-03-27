/**
 * Deepseek implementation of AIProvider.
 *
 * @module
 */

import type { DeepseekConfig } from './types.js'

/**
 *
 */
export class DeepseekAIProvider {
  readonly name = 'deepseek'

  constructor(private config: DeepseekConfig) {
    // TODO: Initialize provider
  }
}

/**
 *
 * @param config
 */
export function createProvider(config: DeepseekConfig): DeepseekAIProvider {
  return new DeepseekAIProvider(config)
}
