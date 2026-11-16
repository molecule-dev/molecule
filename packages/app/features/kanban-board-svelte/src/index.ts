/**
 * Svelte Kanban board primitives (pure presentational — you own the data) —
 * the Svelte counterpart of `@molecule/app-kanban-board-react`, with the same
 * exports, the same props (React names) and the same DOM for the same input.
 *
 * Exports:
 * - `<KanbanBoard>` — columns side-by-side with HTML5 drag-drop between columns.
 *   Props: `columns`, `onCardMove?(cardId, fromColumnId, toColumnId)`,
 *   `onCardClick?(card, column)`, `renderHeaderActions` / `renderFooter`
 *   (snippets taking the column), `className?`.
 * - `<KanbanColumn>` / `<KanbanColumnHeader>` / `<KanbanCard>` — the building blocks,
 *   usable standalone for custom board layouts.
 * - `KanbanColumnData` (`{ id, title, accent?, cards }`), `KanbanCardData`
 *   (`{ id, title, body?, footer? }`) types.
 *
 * This package is standalone UI: it does NOT use the headless
 * `@molecule/app-kanban` core or the `app-kanban-default` bond. Reach for those
 * when you want board STATE management (move/add/remove logic) behind a bond;
 * use this package when you just need the rendered board and will persist moves
 * yourself in `onCardMove`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { KanbanBoard } from '@molecule/app-kanban-board-svelte'
 *   import type { KanbanColumnData } from '@molecule/app-kanban-board-svelte'
 *
 *   let columns: KanbanColumnData[] = [
 *     { id: 'todo', title: 'To Do', cards: [{ id: 'c1', title: 'Research API' }] },
 *     { id: 'doing', title: 'In Progress', accent: 'primary', cards: [{ id: 'c2', title: 'Build UI' }] },
 *     { id: 'done', title: 'Done', accent: 'success', cards: [] },
 *   ]
 * </script>
 *
 * <KanbanBoard
 *   {columns}
 *   onCardMove={(cardId, fromColumnId, toColumnId) => moveCard(cardId, toColumnId)}
 *   onCardClick={(card) => openCardDetail(card.id)}
 * />
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
 * - Styling resolves through `getClassMap()`; `<KanbanCard>` uses the Svelte `Card`
 *   from `@molecule/app-ui-svelte` — wire a ClassMap bond first.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
