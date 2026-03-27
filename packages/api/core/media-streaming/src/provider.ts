/**
 * MediaStreaming provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { MediaStreamingProvider } from './types.js'

let _provider: MediaStreamingProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: MediaStreamingProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): MediaStreamingProvider | null {
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
export function requireProvider(): MediaStreamingProvider {
  if (!_provider) {
    throw new Error(
      'MediaStreaming provider not configured. Bond a media-streaming provider first.',
    )
  }
  return _provider
}
