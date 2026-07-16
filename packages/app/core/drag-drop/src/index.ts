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
 * @remarks
 * - **The instance is a headless order store — no DOM listeners are attached.**
 *   Your UI owns the drag interaction: render the list (via `getClassMap()`/`cm.*`),
 *   wire your framework's drag events (HTML5 DnD / pointer events / a drag library
 *   binding), and drive the instance from them; `onReorder` fires with the new item
 *   array when a reorder completes. Provider bonds may expose framework-binding
 *   hooks (see the bond's own docs) for this wiring.
 * - Every item MUST have a stable string `id` — index-based keys break reordering.
 * - **Persist the new order from `onReorder`** (e.g. send the ordered ids to your
 *   API through the app's HTTP client); on failure, restore the previous order with
 *   `setItems()` so the UI never lies about saved state.
 * - After external data changes, push fresh data with `setItems()` — the instance
 *   does not observe your store.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
