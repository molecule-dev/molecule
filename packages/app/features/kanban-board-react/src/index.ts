/**
 * React Kanban board primitives.
 *
 * Exports:
 * - `<KanbanBoard>` — top-level board with HTML5 drag-drop between columns.
 * - `<KanbanColumn>` — one column (header + card list + optional footer).
 * - `<KanbanColumnHeader>` — title + count + actions row.
 * - `<KanbanCard>` — single draggable card.
 * - `KanbanColumnData`, `KanbanCardData` types.
 *
 * Use the simple HTML5 DnD built into `<KanbanBoard>` or wire
 * `@molecule/app-drag-drop` at the column level for fancier
 * interactions (touch, keyboard, animated reorder).
 *
 * @example
 * ```tsx
 * import { KanbanBoard } from '@molecule/app-kanban-board-react'
 *
 * <KanbanBoard
 *   columns={[
 *     { id: 'todo', title: 'To Do', cards: [{ id: 'c1', title: 'Research API' }] },
 *     { id: 'doing', title: 'In Progress', accent: 'primary', cards: [{ id: 'c2', title: 'Build UI' }] },
 *     { id: 'done', title: 'Done', accent: 'success', cards: [] },
 *   ]}
 *   onCardMove={(cardId, fromColumnId, toColumnId) => moveCard(cardId, toColumnId)}
 *   onCardClick={(card, column) => openCardDetail(card.id)}
 * />
 * ```
 * @module
 */

export * from './KanbanBoard.js'
export * from './KanbanCard.js'
export * from './KanbanColumn.js'
export * from './KanbanColumnHeader.js'
export * from './types.js'
