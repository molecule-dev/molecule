/**
 * AIImageGenerator provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AIImageGeneratorProvider } from './types.js'

let _provider: AIImageGeneratorProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: AIImageGeneratorProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AIImageGeneratorProvider | null {
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
export function requireProvider(): AIImageGeneratorProvider {
  if (!_provider) {
    throw new Error(
      'AIImageGenerator provider not configured. Bond a ai-image-generator provider first.',
    )
  }
  return _provider
}
