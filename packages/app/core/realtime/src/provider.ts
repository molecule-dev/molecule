/**
 * Realtime client provider singleton.
 *
 * Bond packages call {@link setProvider} during application startup.
 * Application code calls {@link getProvider} or the convenience factory
 * ({@link connect}) at runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type { ConnectionOptions, RealtimeClientProvider, RealtimeConnection } from './types.js'

/** Bond category key for the realtime client provider. */
const BOND_TYPE = 'realtime'

/**
 * Registers a realtime client provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/app-realtime-socketio`) during app startup.
 *
 * @param provider - The realtime client provider implementation to bond.
 */
export function setProvider(provider: RealtimeClientProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded realtime client provider, throwing if none is configured.
 *
 * @returns The bonded realtime client provider.
 * @throws {Error} If no realtime client provider has been bonded.
 */
export function getProvider(): RealtimeClientProvider {
  const provider = bondGet<RealtimeClientProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      '@molecule/app-realtime: No provider bonded. Call setProvider() with a realtime bond (e.g. @molecule/app-realtime-socketio).',
    )
  }
  return provider
}

/**
 * Checks whether a realtime client provider is currently bonded.
 *
 * @returns `true` if a realtime client provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Establishes a realtime connection using the bonded provider.
 *
 * @param url - The server URL to connect to.
 * @param options - Optional connection configuration.
 * @returns A promise resolving to a live realtime connection.
 * @throws {Error} If no realtime client provider has been bonded.
 */
export function connect(url: string, options?: ConnectionOptions): Promise<RealtimeConnection> {
  return getProvider().connect(url, options)
}
