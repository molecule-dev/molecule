/**
 * Drag-and-drop provider singleton.
 *
 * Bond packages call {@link setProvider} during application startup.
 * Application code calls {@link getProvider} or the convenience factories
 * ({@link createSortable}, {@link createDraggable}, {@link createDroppable})
 * at runtime.
 *
 * @module
 */

import { bond, get as bondGet, isBonded } from '@molecule/app-bond'

import type {
  DragDropProvider,
  DraggableInstance,
  DraggableOptions,
  DroppableInstance,
  DroppableOptions,
  SortableInstance,
  SortableOptions,
} from './types.js'

/** Bond category key for the drag-drop provider. */
const BOND_TYPE = 'drag-drop'

/**
 * Registers a drag-drop provider as the active singleton. Called by bond
 * packages (e.g. `@molecule/app-drag-drop-dndkit`) during app startup.
 *
 * @param provider - The drag-drop provider implementation to bond.
 */
export function setProvider(provider: DragDropProvider): void {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded drag-drop provider, throwing if none is configured.
 *
 * @returns The bonded drag-drop provider.
 * @throws {Error} If no drag-drop provider has been bonded.
 */
export function getProvider(): DragDropProvider {
  const provider = bondGet<DragDropProvider>(BOND_TYPE)
  if (!provider) {
    throw new Error(
      '@molecule/app-drag-drop: No provider bonded. Call setProvider() with a drag-drop bond (e.g. @molecule/app-drag-drop-dndkit).',
    )
  }
  return provider
}

/**
 * Checks whether a drag-drop provider is currently bonded.
 *
 * @returns `true` if a drag-drop provider is bonded.
 */
export function hasProvider(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Creates a sortable container using the bonded provider.
 *
 * @template T - The item type.
 * @param options - Sortable configuration.
 * @returns A sortable container instance.
 * @throws {Error} If no drag-drop provider has been bonded.
 */
export function createSortable<T extends { id: string }>(
  options: SortableOptions<T>,
): SortableInstance<T> {
  return getProvider().createSortable(options)
}

/**
 * Creates a draggable item using the bonded provider.
 *
 * @param options - Draggable configuration.
 * @returns A draggable instance.
 * @throws {Error} If no drag-drop provider has been bonded.
 */
export function createDraggable(options: DraggableOptions): DraggableInstance {
  return getProvider().createDraggable(options)
}

/**
 * Creates a droppable zone using the bonded provider.
 *
 * @param options - Droppable configuration.
 * @returns A droppable instance.
 * @throws {Error} If no drag-drop provider has been bonded.
 */
export function createDroppable(options: DroppableOptions): DroppableInstance {
  return getProvider().createDroppable(options)
}
