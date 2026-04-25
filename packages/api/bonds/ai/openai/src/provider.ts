/**
 * Openai implementation of AIProvider.
 *
 * @module
 */

import type { OpenaiConfig } from './types.js'

/**
 * Stub OpenAI AI provider scaffold (TODO: implement API wiring).
 */
export class OpenaiAIProvider {
  readonly name = 'openai'

  constructor(private config: OpenaiConfig) {
    // TODO: Initialize provider
  }
}

/**
 * Creates an OpenAI AI provider instance for bonding.
 *
 * @param config - OpenAI provider configuration.
 * @returns An OpenAI-backed provider instance.
 */
export function createProvider(config: OpenaiConfig = {}): OpenaiAIProvider {
  return new OpenaiAIProvider(config)
}
