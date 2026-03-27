/**
 * Reporting provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { ReportingProvider } from './types.js'

let _provider: ReportingProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: ReportingProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): ReportingProvider | null {
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
export function requireProvider(): ReportingProvider {
  if (!_provider) {
    throw new Error('Reporting provider not configured. Bond a reporting provider first.')
  }
  return _provider
}
