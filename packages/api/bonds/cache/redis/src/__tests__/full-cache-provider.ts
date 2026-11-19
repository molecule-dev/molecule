/**
 * Test helper for the Redis cache provider suites.
 *
 * `createProvider()` is declared as the core `CacheProvider` contract, whose
 * bulk operations (`getMany`, `setMany`, `deleteMany`, `invalidateTag`),
 * lifecycle methods (`clear`, `close`, `ping`) and `getOrSet` are all OPTIONAL
 * — the core interface must stay implementable by backends that lack them.
 * The Redis provider implements every one of them, but the declared type
 * keeps them optional, so tests calling the full surface need the narrowing
 * this module provides.
 *
 * @module
 */

import { expect } from 'vitest'

import type { CacheProvider } from '@molecule/api-cache'

/** Every `CacheProvider` member the core contract marks optional. */
const OPTIONAL_METHODS = [
  'getMany',
  'setMany',
  'deleteMany',
  'invalidateTag',
  'clear',
  'close',
  'ping',
  'getOrSet',
] as const

/**
 * Assert that the Redis provider implements every optional `CacheProvider`
 * method, then return it narrowed to the fully-populated type.
 *
 * The runtime check is the proof behind the type: a provider that drops a
 * method fails loudly HERE, instead of the cast silently papering over a
 * real regression.
 *
 * @param provider - The provider under test, typed as the core contract.
 * @returns The same provider, narrowed to `Required<CacheProvider>`.
 */
export function expectFullCacheProvider(provider: CacheProvider): Required<CacheProvider> {
  for (const method of OPTIONAL_METHODS) {
    expect(provider[method], `the Redis provider must implement ${method}()`).toBeTypeOf('function')
  }
  // Safe: every member just above was asserted to be present at runtime.
  return provider as Required<CacheProvider>
}
