/**
 * Kanban board core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for kanban boards with columns,
 * cards, drag-to-move, column reordering, WIP limits, and subscription-based
 * state notifications. Bond a provider (e.g. `@molecule/app-kanban-default`)
 * at startup, then use {@link createBoard} anywhere.
 *
 * @example
 * ```typescript
 * import { setProvider, createBoard } from '@molecule/app-kanban'
 * import { provider } from '@molecule/app-kanban-default'
 *
 * setProvider(provider)
 *
 * const board = createBoard({
 *   columns: [
 *     { id: 'todo', title: 'To Do', cards: [] },
 *     { id: 'in-progress', title: 'In Progress', cards: [], limit: 3 },
 *     { id: 'done', title: 'Done', cards: [] },
 *   ],
 *   onCardMove: (cardId, from, to, pos) => {
 *     api.post('/cards/move', { cardId, from, to, pos })
 *   },
 * })
 *
 * board.onUpdate((state) => {
 *   console.log('Columns:', state.columns.length)
 * })
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
