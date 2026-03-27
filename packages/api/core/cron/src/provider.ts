/**
 * Cron provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { CronProvider } from './types.js'

let _provider: CronProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: CronProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): CronProvider | null {
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
export function requireProvider(): CronProvider {
  if (!_provider) {
    throw new Error('Cron provider not configured. Bond a cron provider first.')
  }
  return _provider
}
