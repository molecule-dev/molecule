/**
 * Real `@dnd-kit` drag-drop provider for molecule.dev.
 *
 * Implements `DragDropProvider` from `@molecule/app-drag-drop` against
 * `@dnd-kit/*`. Two layers ship here:
 *
 * 1. An imperative order store ({@link provider} / {@link createDndKitProvider})
 *    — `createSortable`/`createDraggable`/`createDroppable` — whose reorders use
 *    `@dnd-kit`'s own `arrayMove`.
 * 2. A **real React binding** — {@link SortableList} + {@link useSortableItem} —
 *    that wraps `DndContext` / `SortableContext` / `useSortable` with pointer and
 *    keyboard sensors and, on drop, reorders and invokes the core `onReorder`
 *    with the new order. This is the shipped DOM-event bridge; a drag actually
 *    reorders the list (mouse, touch, or keyboard).
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 * import type { JSX } from 'react'
 *
 * import { setProvider } from '@molecule/app-drag-drop'
 * import { provider, SortableList, useSortableItem } from '@molecule/app-drag-drop-dndkit'
 *
 * // Startup: bond the imperative store (used by the core's createSortable()/createDraggable()).
 * setProvider(provider)
 *
 * interface Task {
 *   id: string
 *   title: string
 * }
 *
 * function TaskRow({ task }: { task: Task }): JSX.Element {
 *   const { setNodeRef, attributes, listeners, style } = useSortableItem({ id: task.id })
 *   // `style` is dnd-kit's transform/transition only — it animates the drag.
 *   return (
 *     <li ref={setNodeRef} style={style} {...attributes} {...listeners} data-mol-id={`task-${task.id}`}>
 *       {task.title}
 *     </li>
 *   )
 * }
 *
 * export function TaskList(): JSX.Element {
 *   const [tasks, setTasks] = useState<Task[]>([
 *     { id: 't1', title: 'Write spec' },
 *     { id: 't2', title: 'Review PR' },
 *     { id: 't3', title: 'Ship it' },
 *   ])
 *   // Dropping a row calls onReorder(newOrder); Space + arrow keys reorder too.
 *   return (
 *     <SortableList items={tasks} onReorder={setTasks}>
 *       <ul>
 *         {tasks.map((task) => (
 *           <TaskRow key={task.id} task={task} />
 *         ))}
 *       </ul>
 *     </SortableList>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Drag-and-drop UI = `SortableList` + `useSortableItem`**; the React binding works
 *   without `setProvider()`. The imperative store behind the core `createSortable()` has NO
 *   DOM wiring and its public instance cannot reorder — calling `createSortable()` alone never
 *   makes anything draggable.
 * - `SortableList` is CONTROLLED: `onReorder` receives the new array and you must store it
 *   (e.g. `setTasks`) — the list does not keep its own order. Every item needs a stable,
 *   unique string `id`, and each row must call `useSortableItem({ id })` with that same id
 *   and spread `attributes` + `listeners` (or `listeners` on a handle) or it cannot be dragged.
 * The React binding requires `react` / `react-dom` (peer dependencies) since
 * `@dnd-kit` is React-only. The imperative store's extended instance types
 * (`_`-prefixed methods) remain available for consumers wiring their own
 * (non-@dnd-kit) drag events. `DndKitConfig.activationDelay` /
 * `activationDistance` are honored by the React binding's pointer sensor.
 *
 * @module
 */

export * from './provider.js'
export * from './react.js'
export * from './types.js'
