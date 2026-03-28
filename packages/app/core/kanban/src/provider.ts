/**
 * Kanban board provider singleton.
 *
 * Bond packages call {@link setProvider} during application startup.
 * Application code calls {@link getProvider} or the convenience factory
 * ({@link createBoard}) at runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type { KanbanInstance, KanbanOptions, KanbanProvider } from './types.js'

/** Bond category key for the kanban provider. */
const BOND_TYPE = 'kanban'

/**
 * Registers a kanban provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/app-kanban-default`) during app startup.
 *
 * @param provider - The kanban provider implementation to bond.
 */
export function setProvider(provider: KanbanProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded kanban provider, throwing if none is configured.
 *
 * @returns The bonded kanban provider.
 * @throws {Error} If no kanban provider has been bonded.
 */
export function getProvider(): KanbanProvider {
  const provider = bondGet<KanbanProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      '@molecule/app-kanban: No provider bonded. Call setProvider() with a kanban bond (e.g. @molecule/app-kanban-default).',
    )
  }
  return provider
}

/**
 * Checks whether a kanban provider is currently bonded.
 *
 * @returns `true` if a kanban provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a kanban board instance using the bonded provider.
 *
 * @typeParam T - Application-specific card data type.
 * @param options - Kanban board configuration.
 * @returns A kanban board instance.
 * @throws {Error} If no kanban provider has been bonded.
 */
export function createBoard<T = unknown>(options: KanbanOptions<T>): KanbanInstance<T> {
  return getProvider().createBoard(options)
}
