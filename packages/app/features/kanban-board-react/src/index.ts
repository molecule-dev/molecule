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
 * @module
 */

export * from './KanbanBoard.js'
export * from './KanbanCard.js'
export * from './KanbanColumn.js'
export * from './KanbanColumnHeader.js'
export * from './types.js'
