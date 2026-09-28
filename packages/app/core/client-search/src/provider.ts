/**
 * Client search provider singleton.
 *
 * Bond packages call {@link setProvider} during application startup.
 * Application code calls {@link getProvider} or the convenience factory
 * ({@link createIndex}) at runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type {
  ClientSearchDocument,
  ClientSearchIndex,
  ClientSearchIndexOptions,
  ClientSearchProvider,
} from './types.js'

/** Bond category key for the client search provider. */
const BOND_TYPE = 'client-search'

/**
 * Registers a client search provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/app-client-search-minisearch`) during app startup.
 *
 * @param provider - The client search provider implementation to bond.
 */
export function setProvider(provider: ClientSearchProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded client search provider, throwing if none is configured.
 *
 * @returns The bonded client search provider.
 * @throws {Error} If no client search provider has been bonded.
 */
export function getProvider(): ClientSearchProvider {
  const provider = bondGet<ClientSearchProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      '@molecule/app-client-search: No provider bonded. Call setProvider() with a client search bond (e.g. @molecule/app-client-search-minisearch).',
    )
  }
  return provider
}

/**
 * Checks whether a client search provider is currently bonded.
 *
 * @returns `true` if a client search provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Builds an index using the bonded provider.
 *
 * @param docs - The documents to index.
 * @param options - How to index them.
 * @returns A searchable index.
 * @throws {Error} If no client search provider has been bonded.
 */
export function createIndex<T extends ClientSearchDocument>(
  docs: T[],
  options: ClientSearchIndexOptions<T>,
): ClientSearchIndex<T> {
  return getProvider().createIndex(docs, options)
}
