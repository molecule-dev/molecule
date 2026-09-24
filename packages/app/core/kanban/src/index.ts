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
 * import { patch } from '@molecule/app-http'
 * import { createBoard, setProvider } from '@molecule/app-kanban'
 * import type { KanbanUpdateHandler } from '@molecule/app-kanban'
 * import { provider } from '@molecule/app-kanban-default'
 *
 * setProvider(provider) // at startup — createBoard() throws until a provider is bonded
 *
 * interface Task {
 *   title: string
 * }
 *
 * const board = createBoard<Task>({
 *   columns: [
 *     { id: 'todo', title: 'To Do', cards: [{ id: 'c1', data: { title: 'Write spec' } }] },
 *     { id: 'doing', title: 'In Progress', cards: [], limit: 3 },
 *     { id: 'done', title: 'Done', cards: [] },
 *   ],
 *   // Fires on every moveCard() — persist the move here.
 *   onCardMove: (cardId, fromColumnId, toColumnId, position) => {
 *     void patch(`/cards/${cardId}`, { columnId: toColumnId, position })
 *   },
 * })
 *
 * const render: KanbanUpdateHandler<Task> = (state) =>
 *   console.log(state.columns.map((column) => `${column.id}:${column.cards.length}`))
 * board.onUpdate(render) // re-render your columns from here
 *
 * // Your drag-and-drop UI reports "c1 dropped at index 0 of 'doing'":
 * board.moveCard('c1', 'doing', 0) // logs ['todo:0', 'doing:1', 'done:0'] + PATCH /cards/c1
 * console.log(board.findCard('c1')?.columnId) // 'doing'
 * board.offUpdate(render) // on unmount — onUpdate() returns nothing
 * ```
 *
 * @remarks
 * - **Headless — `createBoard()` renders NOTHING and has no drag-and-drop.** Render the
 *   columns/cards yourself (`getClassMap()`/`cm.*`, text via `t()`), translate your drag
 *   events (e.g. `@molecule/app-drag-drop`) into `moveCard`/`reorderColumns`, and re-render
 *   from `onUpdate`.
 * - `onCardMove` is REQUIRED and fires only for `moveCard()` (not `addCard`/`removeCard`);
 *   column order changes go to the optional `onColumnReorder`.
 * - `limit` (WIP) is stored, NOT enforced — `moveCard()` into a full column succeeds;
 *   check `getColumn(id)` yourself before moving.
 * - `onUpdate()` returns `void`; unsubscribe with `offUpdate(sameHandler)`.
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
