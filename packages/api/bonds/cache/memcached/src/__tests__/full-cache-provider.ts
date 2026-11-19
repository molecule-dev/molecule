import type { CacheProvider } from '@molecule/api-cache'

/**
 * The optional members of `CacheProvider` — the memcached provider implements
 * every one of them, and these test suites call them directly.
 */
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
 * Verifies at runtime that the provider implements the FULL optional surface of
 * `CacheProvider`, then narrows it to `Required<CacheProvider>` so tests can
 * call the optional methods directly. A missing method fails here, loudly and
 * by name, instead of surfacing as an `undefined` call inside an individual
 * test.
 *
 * @param provider - The provider to verify and narrow.
 * @returns The same provider, typed with every `CacheProvider` member required.
 */
export const asFullCacheProvider = (provider: CacheProvider): Required<CacheProvider> => {
  for (const method of OPTIONAL_METHODS) {
    if (typeof provider[method] !== 'function') {
      throw new Error(`memcached provider does not implement CacheProvider.${method}()`)
    }
  }
  return provider as Required<CacheProvider>
}
