/**
 * NotificationCenter provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { NotificationCenterProvider } from './types.js'

let _provider: NotificationCenterProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: NotificationCenterProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): NotificationCenterProvider | null {
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
export function requireProvider(): NotificationCenterProvider {
  if (!_provider) {
    throw new Error(
      'NotificationCenter provider not configured. Bond a notification-center provider first.',
    )
  }
  return _provider
}
