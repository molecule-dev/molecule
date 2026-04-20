/**
 * AISummarization provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AISummarizationProvider } from './types.js'

let _provider: AISummarizationProvider | null = null

/**
 * Registers the AI summarization provider singleton.
 *
 * @param provider - The AI summarization provider implementation to register.
 */
export function setProvider(provider: AISummarizationProvider): void {
  _provider = provider
}

/**
 * Returns the bonded AI summarization provider, or `null` if none is registered.
 *
 * @returns The active provider, or `null`.
 */
export function getProvider(): AISummarizationProvider | null {
  return _provider
}

/**
 * Returns whether an AI summarization provider has been registered.
 *
 * @returns `true` if a provider is bonded.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Returns the bonded AI summarization provider, throwing if none is configured.
 *
 * @returns The active provider.
 * @throws {Error} When no provider has been bonded.
 */
export function requireProvider(): AISummarizationProvider {
  if (!_provider) {
    throw new Error(
      'AISummarization provider not configured. Bond a ai-summarization provider first.',
    )
  }
  return _provider
}
