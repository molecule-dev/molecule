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
 * Registers the AI image generation provider singleton.
 *
 * @param provider - The AI image generation provider implementation to register.
 */
export function setProvider(provider: AIImageGenerationProvider): void {
  _provider = provider
}

/**
 * Returns the bonded AI image generation provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AIImageGenerationProvider | null {
  return _provider
}

/**
 * Returns whether an AI image generation provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Returns the bonded AI image generation provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AIImageGenerationProvider {
  if (!_provider) {
    throw new Error(
      'AIImageGeneration provider not configured. Bond a ai-image-generation provider first.',
    )
  }
  return _provider
}
