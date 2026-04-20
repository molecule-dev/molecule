/**
 * Markdown provider singleton.
 *
 * Bond packages call `setProvider()` during setup.
 * Application code calls `getProvider()` / `requireProvider()` at runtime.
 *
 * @module
 */

import type { MarkdownProvider } from './types.js'

let _provider: MarkdownProvider | null = null

/**
 * Registers a markdown provider as the active singleton.
 *
 * @param provider - The markdown provider implementation to bond.
 */
export function setProvider(provider: MarkdownProvider): void {
  _provider = provider
}

/**
 * Retrieves the bonded markdown provider, or `null` if none is bonded.
 *
 * @returns The active markdown provider, or `null`.
 */
export function getProvider(): MarkdownProvider | null {
  return _provider
}

/**
 * Checks whether a markdown provider has been bonded.
 *
 * @returns `true` if a markdown provider is available.
 */
export function hasProvider(): boolean {
  return _provider !== null
}

/**
 * Retrieves the bonded markdown provider, throwing if none is configured.
 *
 * @returns The active markdown provider.
 * @throws {Error} if no provider has been bonded.
 */
export function requireProvider(): MarkdownProvider {
  if (!_provider) {
    throw new Error('Markdown provider not configured. Bond a markdown provider first.')
  }
  return _provider
}
