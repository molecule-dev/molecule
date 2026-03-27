/**
 * FeatureFlags provider singleton.
 *
 * Bond packages call set() during setup.
 * Application code calls get()/require() at runtime.
 *
 * @module
 */

import type { FeatureFlagsProvider } from './types.js'

let _provider: FeatureFlagsProvider | null = null

/**
 *
 * @param provider
 */
export function setProvider(provider: FeatureFlagsProvider): void {
  _provider = provider
}

/**
 *
 */
export function getProvider(): FeatureFlagsProvider | null {
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
export function requireProvider(): FeatureFlagsProvider {
  if (!_provider) {
    throw new Error('FeatureFlags provider not configured. Bond a feature-flags provider first.')
  }
  return _provider
}
