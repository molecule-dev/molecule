/**
 * ContentModeration provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { ContentModerationProvider } from './types.js'

let _provider: ContentModerationProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: ContentModerationProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): ContentModerationProvider | null {
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
export function requireProvider(): ContentModerationProvider {
  if (!_provider) {
    throw new Error(
      'ContentModeration provider not configured. Bond a content-moderation provider first.',
    )
  }
  return _provider
}
