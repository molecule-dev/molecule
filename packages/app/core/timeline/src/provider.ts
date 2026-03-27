/**
 * Timeline provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { TimelineProvider } from './types.js'

let _provider: TimelineProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: TimelineProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): TimelineProvider | null {
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
export function requireProvider(): TimelineProvider {
  if (!_provider) {
    throw new Error('Timeline provider not configured. Bond a timeline provider first.')
  }
  return _provider
}
