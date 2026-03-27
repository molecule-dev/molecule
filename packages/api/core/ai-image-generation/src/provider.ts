/**
 * AIImageGeneration provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AIImageGenerationProvider } from './types.js'

let _provider: AIImageGenerationProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: AIImageGenerationProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AIImageGenerationProvider | null {
  return _provider
}

/**
 *
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 *
 */
export function requireProvider(): AIImageGenerationProvider {
  if (!_provider) {
    throw new Error(
      'AIImageGeneration provider not configured. Bond a ai-image-generation provider first.',
    )
  }
  return _provider
}
