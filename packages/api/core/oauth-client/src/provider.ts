/**
 * OauthClient provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { OauthClientProvider } from './types.js'

let _provider: OauthClientProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: OauthClientProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): OauthClientProvider | null {
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
export function requireProvider(): OauthClientProvider {
  if (!_provider) {
    throw new Error('OauthClient provider not configured. Bond a oauth-client provider first.')
  }
  return _provider
}
