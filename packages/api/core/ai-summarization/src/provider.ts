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
 *
 * @param provider
 */
export function setProvider(provider: AISummarizationProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AISummarizationProvider | null {
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
export function requireProvider(): AISummarizationProvider {
  if (!_provider) {
    throw new Error(
      'AISummarization provider not configured. Bond a ai-summarization provider first.',
    )
  }
  return _provider
}
