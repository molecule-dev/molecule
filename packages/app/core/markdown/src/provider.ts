/**
 * Markdown provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { MarkdownProvider } from './types.js'

let _provider: MarkdownProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: MarkdownProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): MarkdownProvider | null {
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
export function requireProvider(): MarkdownProvider {
  if (!_provider) {
    throw new Error('Markdown provider not configured. Bond a markdown provider first.')
  }
  return _provider
}
