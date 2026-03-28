/**
 * AIImageGenerator provider singleton.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import type { AIImageGeneratorProvider } from './types.js'

let _provider: AIImageGeneratorProvider | null = null

/**
 * Registers the active image generator provider.
 *
 * @param provider - The provider implementation to bond.
 */
export function setProvider(provider: AIImageGeneratorProvider): void {
  _provider = provider
}

/**
 * Returns the bonded image generator provider, or `null` if none is set.
 *
 * @returns The active provider or `null`.
 */
export function getProvider(): AIImageGeneratorProvider | null {
  return _provider
}

/**
 * Checks whether an image generator provider has been bonded.
 *
 * @returns `true` if a provider is configured.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Returns the bonded image generator provider or throws if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} If no provider has been bonded.
 */
export function requireProvider(): AIImageGeneratorProvider {
  if (!_provider) {
    throw new Error(
      'AIImageGenerator provider not configured. Bond an ai-image-generator provider first.',
    )
  }
  return _provider
}
