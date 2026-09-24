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
 * import { createSortable, setProvider } from '@molecule/app-drag-drop'
 * import { provider } from '@molecule/app-drag-drop-dndkit'
 *
 * setProvider(provider) // at startup — createSortable() throws until a provider is bonded
 *
 * interface Task {
 *   id: string
 *   title: string
 * }
 * const tasks: Task[] = [
 *   { id: 't1', title: 'Write spec' },
 *   { id: 't2', title: 'Review PR' },
 *   { id: 't3', title: 'Ship it' },
 * ]
 *
 * const sortable = createSortable<Task>({
 *   items: tasks,
 *   axis: 'vertical',
 *   onReorder: (items) => console.log(items.map((task) => task.id)), // persist the new order here
 * })
 * console.log(sortable.getItems().map((task) => task.title)) // ['Write spec', 'Review PR', 'Ship it']
 *
 * // Refetched data (or a failed save) → push the authoritative order back in:
 * sortable.setItems([
 *   { id: 't3', title: 'Ship it' },
 *   { id: 't1', title: 'Write spec' },
 *   { id: 't2', title: 'Review PR' },
 * ])
 * console.log(sortable.getItems().map((task) => task.id)) // ['t3', 't1', 't2']
 * sortable.destroy() // on unmount
 * ```
 *
 * @remarks
 * - **In a React app, the draggable UI is `SortableList` + `useSortableItem` from
 *   `@molecule/app-drag-drop-dndkit`** — `createSortable()` alone never makes anything
 *   draggable, and its public instance has no method that reorders (no `move`/`reorder`).
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
 *   does not observe your store. `setItems()` does NOT fire `onReorder`.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual sortable lists / drop zones, and check every
 * box off one by one. A box you can't check is an integration bug to fix — not
 * a skip:
 * - [ ] Dragging an item to a new position REORDERS the list: the item lands in
 *   the drop slot, the surrounding items shift, and the rendered order now
 *   matches getItems() — reordering along the configured axis (a horizontal or
 *   grid list moves left/right, not just top/bottom). The instance is a headless
 *   order store, so a drag that visibly "does nothing" means the wiring is
 *   missing, not that the feature works.
 * - [ ] The reorder fires onReorder with the NEW item array and the app SAVES
 *   it: after a full reload the list keeps the new order (proving onReorder
 *   persisted it, not just shuffled local state). If the save fails, the UI
 *   restores the previous order via setItems() instead of lying about it.
 * - [ ] Dragging an item BETWEEN two containers moves it: it leaves the source
 *   list and appears in the target, BOTH lists update, and the target's onDrop
 *   fires identifying the item that moved (data + draggableId say which item
 *   went where) — the move survives a reload if the app persists it.
 * - [ ] A drop zone with `accept` set takes only the draggable types it lists
 *   and rejects the rest — a disallowed item does not land there and no onDrop
 *   fires for it.
 * - [ ] A disabled item can't be dragged: with `disabled: true` (on the item or
 *   the whole sortable) a drag attempt does nothing, the order is unchanged, and
 *   no reorder/drop callback fires.
 * - [ ] When `handle: true`, only the drag-handle element starts a drag —
 *   grabbing the item body anywhere else does not move it.
 * - [ ] Dropping outside any valid zone CANCELS: the item snaps back to its
 *   origin, the order is unchanged, and no callback claims a move — the item is
 *   never lost or left in limbo.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
