/**
 * Deepseek implementation of AIProvider.
 *
 * @module
 */

import type { DeepseekConfig } from './types.js'

/**
 * Stub DeepSeek AI provider scaffold (TODO: implement API wiring).
 */
export class DeepseekAIProvider {
  readonly name = 'deepseek'

  constructor(private config: DeepseekConfig) {
    // TODO: Initialize provider
  }
}

/**
 * Creates a DeepSeek AI provider instance for bonding.
 *
 * @param config - DeepSeek provider configuration.
 * @returns A DeepSeek-backed provider instance.
 */
export function createProvider(config: DeepseekConfig): DeepseekAIProvider {
  return new DeepseekAIProvider(config)
}
