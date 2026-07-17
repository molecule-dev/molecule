/**
 * Real @dnd-kit drag-drop provider for molecule.dev.
 *
 * Implements `DragDropProvider` from `@molecule/app-drag-drop` against
 * `@dnd-kit/*`. Two layers ship here:
 *
 * 1. An imperative order store ({@link provider} / {@link createDndKitProvider})
 *    — `createSortable`/`createDraggable`/`createDroppable` — whose reorders use
 *    @dnd-kit's own `arrayMove`.
 * 2. A **real React binding** — {@link SortableList} + {@link useSortableItem} —
 *    that wraps `DndContext` / `SortableContext` / `useSortable` with pointer and
 *    keyboard sensors and, on drop, reorders and invokes the core `onReorder`
 *    with the new order. This is the shipped DOM-event bridge; a drag actually
 *    reorders the list (mouse, touch, or keyboard).
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-drag-drop-dndkit'
 * import { setProvider } from '@molecule/app-drag-drop'
 *
 * setProvider(provider)
 * ```
 *
 * @example
 * ```tsx
 * import { SortableList, useSortableItem } from '@molecule/app-drag-drop-dndkit'
 *
 * // Dropping a row calls onReorder(newOrder); Space + arrow keys reorder too.
 * <SortableList items={items} onReorder={setItems}>
 *   <ul>{items.map((item) => <Row key={item.id} item={item} />)}</ul>
 * </SortableList>
 * ```
 *
 * @remarks
 * The React binding requires `react` / `react-dom` (peer dependencies) since
 * @dnd-kit is React-only. The imperative store's extended instance types
 * (`_`-prefixed methods) remain available for consumers wiring their own
 * (non-@dnd-kit) drag events. `DndKitConfig.activationDelay` /
 * `activationDistance` are honored by the React binding's pointer sensor.
 *
 * @module
 */

export * from './provider.js'
export * from './react.js'
export * from './types.js'
