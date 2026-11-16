/**
 * Solid sortable list for `@molecule/app-drag-drop-dndkit`.
 *
 * {@link SortableList} renders a list the user reorders with the pointer,
 * touch or the keyboard, on `@dnd-kit/solid`. Each row calls
 * {@link useSortableItem}. The options are `@molecule/app-drag-drop-dndkit`'s
 * `SortableListOptions`, the same in the React, Vue, Svelte and Angular
 * bindings, so a list swaps between frameworks unchanged.
 *
 * @example
 * ```tsx
 * import { For } from 'solid-js'
 * import { SortableList, useSortableItem } from '@molecule/app-drag-drop-dndkit-solid'
 *
 * function Row(props: { task: Task }) {
 *   const item = useSortableItem({ id: props.task.id })
 *   return (
 *     <li ref={item.ref} data-dragging={item.isDragging()}>
 *       {props.task.title}
 *     </li>
 *   )
 * }
 *
 * function Tasks(props: { tasks: Task[]; setTasks: (next: Task[]) => void }) {
 *   return (
 *     <SortableList
 *       items={props.tasks}
 *       onReorder={props.setTasks}
 *       getItemLabel={(task) => task.title}
 *     >
 *       <ul>
 *         <For each={props.tasks}>{(task) => <Row task={task} />}</For>
 *       </ul>
 *     </SortableList>
 *   )
 * }
 * ```
 *
 * @remarks
 * The screen-reader instructions and announcements use the
 * `dragDrop.sortable.*` keys; bond `@molecule/app-locales-drag-drop-dndkit` for
 * their translations. Persist the order in `onReorder`; if saving fails,
 * restore the previous `items`.
 *
 * @module
 */

export * from './SortableList.jsx'
export * from './useSortableItem.js'
