/**
 * React Kanban board primitives (pure presentational — you own the data).
 *
 * Exports:
 * - `<KanbanBoard>` — columns side-by-side with HTML5 drag-drop between columns.
 *   Props: `columns`, `onCardMove?(cardId, fromColumnId, toColumnId)`,
 *   `onCardClick?(card, column)`, `renderHeaderActions?(column)`,
 *   `renderFooter?(column)`, `className?`.
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
 * ```tsx
 * import { useState } from 'react'
 *
 * import { KanbanBoard, type KanbanColumnData } from '@molecule/app-kanban-board-react'
 *
 * const initialColumns: KanbanColumnData[] = [
 *   { id: 'todo', title: 'To Do', cards: [{ id: 'c1', title: 'Research API' }] },
 *   { id: 'doing', title: 'In Progress', cards: [{ id: 'c2', title: 'Build UI', body: 'Board + cards' }] },
 *   { id: 'done', title: 'Done', cards: [] },
 * ]
 *
 * export function BoardPage() {
 *   const [columns, setColumns] = useState(initialColumns)
 *   function moveCard(cardId: string, fromColumnId: string, toColumnId: string): void {
 *     setColumns((cols) => {
 *       const card = cols.find((c) => c.id === fromColumnId)?.cards.find((c) => c.id === cardId)
 *       if (!card) return cols
 *       return cols.map((col) =>
 *         col.id === fromColumnId
 *           ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
 *           : col.id === toColumnId
 *             ? { ...col, cards: [...col.cards, card] }
 *             : col,
 *       )
 *     })
 *   }
 *   return <KanbanBoard columns={columns} onCardMove={moveCard} />
 * }
 * ```
 *
 * @remarks
 * - It does NOT move cards itself. Consumers own the data: update your `columns` state in
 *   `onCardMove` (and persist it) or the board snaps back on re-render. Without `onCardMove`
 *   the columns are not drop targets at all.
 * - `onCardMove` fires only when a card is dropped on a DIFFERENT column, and no insertion
 *   index is reported — same-column reordering is not supported; append to the target column.
 * - Drag-drop is native HTML5 DnD: it does not fire on touch devices — provide an alternate
 *   affordance (e.g. a move menu via `renderHeaderActions` or `onCardClick`) for mobile.
 * - `accent` on a column is currently cosmetic metadata only (not rendered).
 * - Styling resolves through `getClassMap()`, which throws unless `setClassMap(classMap)` from
 *   `@molecule/app-ui` ran at startup; `<KanbanCard>` uses `<Card>` from
 *   `@molecule/app-ui-react` (a peer dependency).
 *
 * @module
 */

export * from './KanbanBoard.js'
export * from './KanbanCard.js'
export * from './KanbanColumn.js'
export * from './KanbanColumnHeader.js'
export * from './types.js'
