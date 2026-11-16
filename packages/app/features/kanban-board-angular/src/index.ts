/**
 * Angular Kanban board primitives (pure presentational — you own the data) —
 * the Angular counterpart of `@molecule/app-kanban-board-react`, with the same
 * exports, the same props (React names) and the same DOM for the same input.
 *
 * Exports:
 * - `<KanbanBoard>` (`div[mol-kanban-board]`) — columns side-by-side with HTML5
 *   drag-drop between columns. Props: `columns`,
 *   `onCardMove?(cardId, fromColumnId, toColumnId)`, `onCardClick?(card, column)`,
 *   `renderHeaderActions` / `renderFooter` (templates whose context carries the
 *   column as `a0`), `className?`.
 * - `<KanbanColumn>` (`section[mol-kanban-column]`) / `<KanbanColumnHeader>`
 *   (`header[mol-kanban-column-header]`) / `<KanbanCard>`
 *   (`div[mol-kanban-card]`) — the building blocks, usable standalone.
 * - `KanbanColumnData` (`{ id, title, accent?, cards }`), `KanbanCardData`
 *   (`{ id, title, body?, footer? }`) types. Node-valued fields are template
 *   references or text.
 *
 * This package is standalone UI: it does NOT use the headless
 * `@molecule/app-kanban` core or the `app-kanban-default` bond. Reach for those
 * when you want board STATE management (move/add/remove logic) behind a bond;
 * use this package when you just need the rendered board and will persist moves
 * yourself in `onCardMove`.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { KanbanBoard } from '@molecule/app-kanban-board-angular'
 * import type { KanbanColumnData } from '@molecule/app-kanban-board-angular'
 *
 * @Component({
 *   selector: 'app-board',
 *   standalone: true,
 *   imports: [KanbanBoard],
 *   template: `
 *     <div
 *       mol-kanban-board
 *       [columns]="columns"
 *       [onCardMove]="move"
 *       [onCardClick]="open"
 *     ></div>
 *   `,
 * })
 * export class Board {
 *   columns: KanbanColumnData[] = [
 *     { id: 'todo', title: 'To Do', cards: [{ id: 'c1', title: 'Research API' }] },
 *     { id: 'doing', title: 'In Progress', accent: 'primary', cards: [{ id: 'c2', title: 'Build UI' }] },
 *     { id: 'done', title: 'Done', accent: 'success', cards: [] },
 *   ]
 *
 *   move = (cardId: string, from: string, to: string): void => moveCard(cardId, to)
 *   open = (card: { id: string }): void => openCardDetail(card.id)
 * }
 * ```
 *
 * @remarks
 * - Drag-drop is native HTML5 DnD: it does not fire on touch devices — provide
 *   an alternate affordance (e.g. a move menu in `renderHeaderActions`) for mobile.
 * - `onCardMove` fires only when a card is dropped on a DIFFERENT column, and no
 *   insertion index is reported — same-column reordering is not supported; movers
 *   can only append to the target column.
 * - Consumers own the data: update your `columns` state in `onCardMove` or the
 *   board will snap back on re-render.
 * - `accent` on a column is currently cosmetic metadata only.
 * - Node props are template references or projected content: the column heading
 *   and actions accept `[slot=title]` / `[slot=actions]`, the column accepts
 *   `[slot=headerActions]` / `[slot=footer]`.
 * - Styling resolves through `getClassMap()`; `<KanbanCard>` renders React's
 *   `Card` classes itself — wire a ClassMap bond first.
 *
 * @module
 */

export * from './kanban-board.component.js'
export * from './kanban-card.component.js'
export * from './kanban-column.component.js'
export * from './kanban-column-header.component.js'
export * from './types.js'
