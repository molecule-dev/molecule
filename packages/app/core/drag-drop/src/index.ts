/**
 * Drag-and-drop core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for sortable lists, draggable items,
 * and droppable zones. Bond a provider (e.g. `@molecule/app-drag-drop-dndkit`)
 * at startup, then use {@link createSortable}, {@link createDraggable}, or
 * {@link createDroppable} anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider, createSortable } from '@molecule/app-drag-drop'
 * import { provider } from '@molecule/app-drag-drop-dndkit'
 *
 * setProvider(provider)
 *
 * const sortable = createSortable({
 *   items: [{ id: '1' }, { id: '2' }, { id: '3' }],
 *   axis: 'vertical',
 *   onReorder: (items) => console.log('New order:', items),
 * })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
