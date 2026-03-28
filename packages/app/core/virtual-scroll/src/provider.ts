/**
 * Virtual scroll provider singleton.
 *
 * Bond packages call {@link setProvider} during application startup.
 * Application code calls {@link getProvider} or {@link createVirtualizer}
 * at runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type { VirtualScrollInstance, VirtualScrollOptions, VirtualScrollProvider } from './types.js'

/** Bond category key for the virtual scroll provider. */
const BOND_TYPE = 'virtual-scroll'

/**
 * Registers a virtual scroll provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/app-virtual-scroll-tanstack`) during app startup.
 *
 * @param provider - The virtual scroll provider implementation to bond.
 */
export function setProvider(provider: VirtualScrollProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded virtual scroll provider, throwing if none is configured.
 *
 * @returns The bonded virtual scroll provider.
 * @throws {Error} If no virtual scroll provider has been bonded.
 */
export function getProvider(): VirtualScrollProvider {
  const provider = bondGet<VirtualScrollProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      '@molecule/app-virtual-scroll: No provider bonded. Call setProvider() with a virtual scroll bond (e.g. @molecule/app-virtual-scroll-tanstack).',
    )
  }
  return provider
}

/**
 * Checks whether a virtual scroll provider is currently bonded.
 *
 * @returns `true` if a virtual scroll provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a new virtualizer instance using the bonded provider.
 *
 * @param scrollElement - The scrollable container element (or a getter returning it).
 * @param options - Virtualizer configuration.
 * @returns A virtualizer instance for querying virtual items and controlling scroll.
 * @throws {Error} If no virtual scroll provider has been bonded.
 */
export function createVirtualizer(
  scrollElement: unknown | (() => unknown),
  options: VirtualScrollOptions,
): VirtualScrollInstance {
  return getProvider().createVirtualizer(scrollElement, options)
}
