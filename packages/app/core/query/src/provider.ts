/**
 * Query provider singleton, and the one client every page shares.
 *
 * Bond packages call {@link setProvider} during application startup.
 * Application code calls {@link getQueryClient} at runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type { QueryClient, QueryClientConfig, QueryProvider } from './types.js'

/** Bond category key for the query provider. */
const BOND_TYPE = 'query'

let client: QueryClient | null = null
let clientConfig: QueryClientConfig | undefined

/**
 * Registers a query provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/app-query-tanstack`) during app startup.
 *
 * @param provider - The query provider implementation to bond.
 */
export function setProvider(provider: QueryProvider): void {
  bond(BOND_TYPE, provider)
  client = null
}

/**
 * Retrieves the bonded query provider, throwing if none is configured.
 *
 * @returns The bonded query provider.
 * @throws {Error} If no query provider has been bonded.
 */
export function getProvider(): QueryProvider {
  const provider = bondGet<QueryProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      '@molecule/app-query: No provider bonded. Call setProvider() with a query bond (e.g. @molecule/app-query-tanstack).',
    )
  }
  return provider
}

/**
 * Checks whether a query provider is currently bonded.
 *
 * @returns `true` if a query provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Sets the defaults the shared client is created with. Call before the first
 * {@link getQueryClient}; later calls take effect after {@link resetQueryClient}.
 *
 * @param config - Defaults for every query.
 */
export function configureQueryClient(config: QueryClientConfig | undefined): void {
  clientConfig = config
}

/**
 * The app's one cache, created by the bonded provider on first use and
 * reused afterwards, so every page reads and warms the same documents.
 *
 * @returns The shared client.
 * @throws {Error} If no query provider has been bonded.
 */
export function getQueryClient(): QueryClient {
  if (!client) client = getProvider().createClient(clientConfig)
  return client
}

/**
 * Forgets the shared client (its next use creates a new one). Tests only.
 */
export function resetQueryClient(): void {
  client?.clear()
  client = null
}
