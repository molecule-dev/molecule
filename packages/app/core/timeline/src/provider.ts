/**
 * Timeline provider singleton.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import type { TimelineProvider } from './types.js'

let _provider: TimelineProvider | null = null

/**
 * Registers a timeline provider as the active singleton.
 *
 * @param provider - The timeline provider implementation to bond.
 */
export function setProvider(provider: TimelineProvider): void {
  _provider = provider
}

/**
 * Retrieves the bonded timeline provider, or `null` if none is bonded.
 *
 * @returns The active timeline provider, or `null`.
 */
export function getProvider(): TimelineProvider | null {
  return _provider
}

/**
 * Checks whether a timeline provider has been bonded.
 *
 * @returns `true` if a timeline provider is available.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Retrieves the bonded timeline provider, throwing if none is configured.
 *
 * @returns The active timeline provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): TimelineProvider {
  if (!_provider) {
    throw new Error('Timeline provider not configured. Bond a timeline provider first.')
  }
  return _provider
}
