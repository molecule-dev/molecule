/**
 * AIClassification provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { AIClassificationProvider } from './types.js'

let _provider: AIClassificationProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: AIClassificationProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): AIClassificationProvider | null {
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
export function requireProvider(): AIClassificationProvider {
  if (!_provider) {
    throw new Error(
      'AIClassification provider not configured. Bond a ai-classification provider first.',
    )
  }
  return _provider
}
