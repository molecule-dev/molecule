/**
 * Sms provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { SmsProvider } from './types.js'

let _provider: SmsProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: SmsProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): SmsProvider | null {
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
export function requireProvider(): SmsProvider {
  if (!_provider) {
    throw new Error('Sms provider not configured. Bond a sms provider first.')
  }
  return _provider
}
