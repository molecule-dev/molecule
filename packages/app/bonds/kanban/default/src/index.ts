/**
 * Default kanban provider for molecule.dev.
 *
 * Provides an in-memory kanban board implementation with column/card CRUD,
 * drag state tracking, column reordering, and subscription-based state
 * notifications. No external dependencies.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-kanban'
 * import { provider } from '@molecule/app-kanban-default'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * - **Headless state container** — no DOM and no drag-and-drop UI. Your app
 *   renders columns/cards (ClassMap + `t()`) and translates its own drag
 *   events into `moveCard`/`addCard`/`reorderColumns`; subscribe with
 *   `onUpdate` to re-render.
 * - `KanbanOptions.onCardMove` is required and fires on every `moveCard` —
 *   persist the move there.
 * - **`DefaultKanbanConfig.cloneCardData`** controls snapshot isolation of card
 *   `data`. Default `false` returns `data` by reference (columns/cards are
 *   shallow-cloned) for performance. Set it `true` to deep-clone each card's
 *   `data` (via `structuredClone`) in every returned snapshot
 *   (`getColumns`/`getColumn`/`findCard`/`getState`/`onUpdate`), so callers can
 *   mutate returned data without touching board state.
 * - `destroy()` clears the board and detaches all subscribers; instances are
 *   independent (`createBoard` per board).
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
