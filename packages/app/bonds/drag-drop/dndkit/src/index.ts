/**
 * Real `@dnd-kit` drag-drop provider for molecule.dev.
 *
 * Implements `DragDropProvider` from `@molecule/app-drag-drop` on `@dnd-kit`'s
 * framework-neutral DOM layer. Two layers ship here, neither tied to a UI
 * framework:
 *
 * 1. An imperative order store ({@link provider} / {@link createDndKitProvider})
 *    — `createSortable`/`createDraggable`/`createDroppable` — whose reorders use
 *    `@dnd-kit/helpers`' `arrayMove`.
 * 2. What every framework's sortable list shares: the pointer and keyboard
 *    sensors ({@link sortableListSensors}), the axis limits
 *    ({@link sortableListModifiers}), the translated screen-reader instructions
 *    and announcements ({@link sortableListPlugins}) and the drop rule
 *    ({@link sortableListDrop}), with the options every list takes
 *    ({@link SortableListOptions}).
 *
 * The sortable lists themselves are in the framework bindings:
 * `@molecule/app-drag-drop-dndkit-react`, `-vue`, `-solid`, `-svelte` and
 * `-angular`. Each takes the same {@link SortableListOptions}, so a list swaps
 * between frameworks unchanged.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-drag-drop-dndkit'
 * import { setProvider } from '@molecule/app-drag-drop'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * The announcements use the `dragDrop.sortable.*` keys; bond
 * `@molecule/app-locales-drag-drop-dndkit` for their translations.
 * `DndKitConfig.activationDelay` / `activationDistance` set the pointer
 * sensor of every framework's list.
 *
 * @module
 */

export * from './provider.js'
export * from './sortable-list.js'
export * from './sortable-list-locale.js'
export * from './types.js'
