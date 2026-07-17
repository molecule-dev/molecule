/**
 * AISpeech provider bond accessor.
 *
 * Bond packages call `setProvider()` during setup, which registers the provider
 * in the shared `@molecule/api-bond` registry under the `'ai-speech'` bond type.
 * Application code calls `getProvider()`/`requireProvider()` at runtime. Because
 * wiring routes through the shared registry, a generic `bond('ai-speech',
 * provider)` call is equivalent to `setProvider()` and `validateBonds()` can
 * detect a missing provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { AISpeechProvider } from './types.js'

const BOND_TYPE = 'ai-speech'
expectBond(BOND_TYPE)

/**
 * Register an AISpeech provider implementation.
 *
 * @param provider - The speech provider to register.
 */
export function setProvider(provider: AISpeechProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Get the registered AISpeech provider, or null if none is registered.
 *
 * @returns The registered provider, or null.
 */
export function getProvider(): AISpeechProvider | null {
  return isBonded(BOND_TYPE) ? bondRequire<AISpeechProvider>(BOND_TYPE) : null
}

/**
 * Check whether an AISpeech provider is registered.
 *
 * @returns True if a provider has been registered.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Get the registered AISpeech provider, throwing if none is registered.
 *
 * @returns The registered provider.
 * @throws {Error} if no provider has been registered.
 */
export function requireProvider(): AISpeechProvider {
  try {
    return bondRequire<AISpeechProvider>(BOND_TYPE)
  } catch (error) {
    throw new Error('AISpeech provider not configured. Bond a ai-speech provider first.', {
      cause: error,
    })
  }
}
