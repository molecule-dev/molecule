/**
 * Vue sortable list for `@molecule/app-drag-drop-dndkit`.
 *
 * {@link SortableList} renders a list the user reorders with the pointer,
 * touch or the keyboard, on `@dnd-kit/vue`. Each row calls
 * {@link useSortableItem}. The options are `@molecule/app-drag-drop-dndkit`'s
 * `SortableListOptions`, the same in the React, Solid, Svelte and Angular
 * bindings, so a list swaps between frameworks unchanged.
 *
 * @example
 * ```vue
 * <!-- TaskRow.vue -->
 * <script setup lang="ts">
 * import { useSortableItem } from '@molecule/app-drag-drop-dndkit-vue'
 * import type { ComponentPublicInstance } from 'vue'
 *
 * interface Task {
 *   id: string
 *   title: string
 * }
 *
 * const props = defineProps<{ task: Task }>()
 * const { ref: rowRef, isDragging } = useSortableItem({ id: props.task.id })
 *
 * // A template ref may also receive a component instance, which is not this row's element.
 * const setRow = (element: Element | ComponentPublicInstance | null): void => {
 *   rowRef(element instanceof Element ? element : null)
 * }
 * </script>
 *
 * <template>
 *   <li :ref="setRow" :data-dragging="isDragging">{{ task.title }}</li>
 * </template>
 * ```
 *
 * @example
 * ```vue
 * <!-- Tasks.vue -->
 * <script setup lang="ts">
 * import { SortableList } from '@molecule/app-drag-drop-dndkit-vue'
 * import TaskRow from './TaskRow.vue'
 *
 * interface Task {
 *   id: string
 *   title: string
 * }
 *
 * defineProps<{ tasks: Task[] }>()
 * defineEmits<{ reorder: [tasks: Task[]] }>()
 * </script>
 *
 * <template>
 *   <SortableList
 *     :items="tasks"
 *     :on-reorder="(reordered) => $emit('reorder', reordered)"
 *     :get-item-label="(task) => task.title"
 *   >
 *     <ul>
 *       <TaskRow v-for="task in tasks" :key="task.id" :task="task" />
 *     </ul>
 *   </SortableList>
 * </template>
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
