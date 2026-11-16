/**
 * Svelte sortable list for `@molecule/app-drag-drop-dndkit`.
 *
 * `SortableList` renders a list the user reorders with the pointer, touch or
 * the keyboard, on `@dnd-kit/svelte`. Each row calls `useSortableItem`. The
 * options are `@molecule/app-drag-drop-dndkit`'s `SortableListOptions`, the
 * same in the React, Vue, Solid, Svelte and Angular bindings, so a list swaps
 * between frameworks unchanged.
 *
 * `useSortableItem` returns Svelte attachments for the row element (`ref`) and
 * an optional drag handle (`handleRef`), plus the row's `isDragging` and
 * `isDropTarget` state as read-only reactive getters. Apply an attachment with
 * Svelte's attachment tag on the element, or with `createAttachmentKey()` in a
 * spread, as the example below shows.
 *
 * @example
 * ```svelte
 * <!-- Row.svelte -->
 * <script lang="ts">
 *   import { createAttachmentKey } from 'svelte/attachments'
 *
 *   import { useSortableItem } from '@molecule/app-drag-drop-dndkit-svelte'
 *
 *   let { task }: { task: Task } = $props()
 *
 *   const { ref, isDragging } = useSortableItem({ id: task.id })
 *   const attach = { [createAttachmentKey()]: ref }
 * </script>
 *
 * <li {...attach} data-dragging={isDragging}>{task.title}</li>
 * ```
 *
 * ```svelte
 * <!-- Tasks.svelte -->
 * <script lang="ts">
 *   import { SortableList } from '@molecule/app-drag-drop-dndkit-svelte'
 *   import Row from './Row.svelte'
 *
 *   let { tasks }: { tasks: Task[] } = $props()
 * </script>
 *
 * <SortableList items={tasks} onReorder={(next) => (tasks = next)} getItemLabel={(task) => task.title}>
 *   <ul>
 *     {#each tasks as task (task.id)}
 *       <Row {task} />
 *     {/each}
 *   </ul>
 * </SortableList>
 * ```
 *
 * @remarks
 * The screen-reader instructions and announcements use the
 * `dragDrop.sortable.*` keys; bond `@molecule/app-locales-drag-drop-dndkit` for
 * their translations. Persist the order in `onReorder`; if saving fails,
 * restore the previous `items`. Set an item's `disabled` option to pin one row,
 * or the list's `disabled` prop to pin the whole list.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
export * from './useSortableItem.svelte.js'
