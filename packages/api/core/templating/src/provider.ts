/**
 * Templating provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { TemplatingProvider } from './types.js'

let _provider: TemplatingProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: TemplatingProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): TemplatingProvider | null {
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
export function requireProvider(): TemplatingProvider {
  if (!_provider) {
    throw new Error('Templating provider not configured. Bond a templating provider first.')
  }
  return _provider
}
