/**
 * Angular sortable list for `@molecule/app-drag-drop-dndkit`.
 *
 * {@link SortableList} (`[molSortableList]`) renders a list the user reorders
 * with the pointer, touch or the keyboard, on `@dnd-kit/dom`. Each row is a
 * {@link SortableItem} (`[molSortableItem]`) — or a component calling
 * {@link useSortableItem} in its field initializer. The options are
 * `@molecule/app-drag-drop-dndkit`'s `SortableListOptions`, the same in the
 * React, Vue, Solid and Svelte bindings, so a list swaps between frameworks
 * unchanged. The row directives {@link SortableItem} and
 * {@link SortableItemHandle} are Angular's own: a row's id comes from a
 * template binding, which `useSortableItem` (read once, when the component is
 * constructed) cannot follow. The callbacks are inputs, not outputs, so a consumer passes the
 * same functions a React list takes.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { SortableItem, SortableList } from '@molecule/app-drag-drop-dndkit-angular'
 *
 * @Component({
 *   selector: 'app-tasks',
 *   standalone: true,
 *   imports: [SortableList, SortableItem],
 *   template: `
 *     <ul molSortableList [items]="tasks()" [onReorder]="save" [getItemLabel]="label">
 *       @for (task of tasks(); track task.id) {
 *         <li molSortableItem [molSortableItem]="task.id">{{ task.title }}</li>
 *       }
 *     </ul>
 *   `,
 * })
 * class Tasks {
 *   readonly tasks = signal([{ id: 'a', title: 'Alpha' }])
 *   readonly save = (items: { id: string; title: string }[]) => this.tasks.set(items)
 *   readonly label = (task: { id: string; title: string }) => task.title
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

export * from './sortable-item.js'
export * from './sortable-list.js'
export * from './use-sortable-item.js'
