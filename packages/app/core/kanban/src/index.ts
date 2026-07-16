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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The board renders every column with its cards in order, and each
 *   column's card count matches the cards actually shown beneath it.
 * - [ ] Dragging a card onto a DIFFERENT column moves it there and it persists:
 *   after a full reload the card stays in the new column — proving the move
 *   fired the change callback (onCardMove) and the app SAVED it, not just
 *   shuffled local state.
 * - [ ] Dragging a card WITHIN a column to a new spot changes its order, and
 *   that new position survives a reload.
 * - [ ] Adding a card through the app's flow drops it into the target column,
 *   editing a card updates its content in place, and deleting removes it — each
 *   change sticking after reload.
 * - [ ] An empty column is a valid drop target: a card dragged onto it lands
 *   there and both columns' counts update correctly.
 * - [ ] If the app defines WIP limits, a column already at its limit visibly
 *   flags or rejects an over-limit drop (the core stores `limit` but does not
 *   enforce it — the app must), so a column's count never silently exceeds it.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
