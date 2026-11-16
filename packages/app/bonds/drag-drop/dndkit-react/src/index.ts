/**
 * React sortable list for `@molecule/app-drag-drop-dndkit`.
 *
 * {@link SortableList} renders a list the user reorders with the pointer,
 * touch or the keyboard, on `@dnd-kit/react`. Each row calls
 * {@link useSortableItem}. The options are `@molecule/app-drag-drop-dndkit`'s
 * `SortableListOptions`, the same in the Vue, Solid, Svelte and Angular
 * bindings, so a list swaps between frameworks unchanged.
 *
 * @example
 * ```tsx
 * import { SortableList, useSortableItem } from '@molecule/app-drag-drop-dndkit-react'
 *
 * function Row({ task }: { task: Task }) {
 *   const { ref, isDragging } = useSortableItem({ id: task.id })
 *   return <li ref={ref} data-dragging={isDragging}>{task.title}</li>
 * }
 *
 * function Tasks({ tasks, setTasks }: { tasks: Task[]; setTasks: (next: Task[]) => void }) {
 *   return (
 *     <SortableList items={tasks} onReorder={setTasks} getItemLabel={(task) => task.title}>
 *       <ul>{tasks.map((task) => <Row key={task.id} task={task} />)}</ul>
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

export * from './SortableList.js'
export * from './useSortableItem.js'
