/**
 * Angular drag-handle reorderable list (HTML5 drag-and-drop) — the counterpart
 * of `@molecule/app-reorderable-list-react`: the same props and the same DOM
 * for the same input.
 *
 * Exports `<ReorderableList>` (`ul[mol-reorderable-list]`) and the
 * `ReorderableItem<T>` type (`{ id: string; data: T }`). Fully controlled: it
 * renders rows and calls `onReorder(next)` with the complete reordered array —
 * the app owns state. Props: `items`, `onReorder`,
 * `renderItem` (a `TemplateRef` whose context carries the item as `a0` and the
 * drag flag as `a1`), `renderHandle` (when set, only the handle is draggable —
 * e.g. a "≡" glyph; otherwise the whole row drags), `className`.
 *
 * Reordering works with a mouse (HTML5 drag) AND the keyboard: every row has
 * move-up/move-down buttons (`data-mol-id="reorderable-move-{up,down}-<id>"`),
 * and Alt+ArrowUp / Alt+ArrowDown on a focused move button reorders its row.
 * Focus follows the item: a move that disables the used button (the item
 * reached the top or the bottom) moves focus to the same row's other button.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ReorderableList } from '@molecule/app-reorderable-list-angular'
 * import type { ReorderableItem } from '@molecule/app-reorderable-list-angular'
 *
 * @Component({
 *   selector: 'app-steps',
 *   standalone: true,
 *   imports: [ReorderableList],
 *   template: `
 *     <ul
 *       mol-reorderable-list
 *       [items]="items"
 *       [onReorder]="reorder"
 *       [renderItem]="row"
 *     ></ul>
 *     <ng-template #row let-item="a0">
 *       <span>{{ item.data.label }}</span>
 *     </ng-template>
 *   `,
 * })
 * export class Steps {
 *   items: ReorderableItem<{ label: string }>[] = [
 *     { id: '1', data: { label: 'First' } },
 *     { id: '2', data: { label: 'Second' } },
 *   ]
 *
 *   reorder = (next: ReorderableItem<{ label: string }>[]): void => {
 *     this.items = next
 *   }
 * }
 * ```
 *
 * @remarks
 * - Native HTML5 drag works with MOUSE/POINTER only — touch devices
 *   (iOS/Android) fire no HTML5 drag events. The keyboard path (move buttons +
 *   Alt+Arrow) is the a11y/touch-safe fallback and is always present; add a
 *   pointer/touch drag library only if you also need touch DRAG specifically.
 * - Requires a bonded ClassMap (`setClassMap()` at startup) and an i18n
 *   provider (for the control labels) or rendering throws.
 * - Item `id`s must be unique — drop resolution matches by id.
 * - Control labels ("Move up/down", "Drag to reorder", row position) render
 *   through `t(...)` under `reorderableList.*`, translated by the
 *   `@molecule/app-locales-reorderable-list` companion bond.
 *
 * @module
 */

export * from './reorderable-list.component.js'
export * from './types.js'
