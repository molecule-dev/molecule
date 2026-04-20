/**
 * Tour provider singleton.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import type { TourProvider } from './types.js'

let _provider: TourProvider | null = null

/**
 * Registers a tour provider as the active singleton.
 *
 * @param provider - The tour provider implementation to bond.
 */
export function setProvider(provider: TourProvider): void {
  _provider = provider
}

/**
 * Retrieves the bonded tour provider, or `null` if none is bonded.
 *
 * @returns The active tour provider, or `null`.
 */
export function getProvider(): TourProvider | null {
  return _provider
}

/**
 * Checks whether a tour provider has been bonded.
 *
 * @returns `true` if a tour provider is available.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Retrieves the bonded tour provider, throwing if none is configured.
 *
 * @returns The active tour provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): TourProvider {
  if (!_provider) {
    throw new Error('Tour provider not configured. Bond a tour provider first.')
  }
  return _provider
}
