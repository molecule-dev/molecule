/**
 * AITranslation provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AITranslationProvider } from './types.js'

let _provider: AITranslationProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: AITranslationProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AITranslationProvider | null {
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
export function requireProvider(): AITranslationProvider {
  if (!_provider) {
    throw new Error('AITranslation provider not configured. Bond a ai-translation provider first.')
  }
  return _provider
}
