/**
 * Default implementation of the molecule KanbanProvider.
 *
 * Manages in-memory kanban board state with support for column / card CRUD,
 * drag state tracking, column reordering, and subscription-based state change
 * notifications. No external dependencies — pure TypeScript.
 *
 * @module
 */

import type {
  KanbanCard,
  KanbanColumn,
  KanbanInstance,
  KanbanOptions,
  KanbanProvider,
  KanbanState,
  KanbanUpdateHandler,
} from '@molecule/app-kanban'

import type { DefaultKanbanConfig } from './types.js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Shallow-clones a column and its cards array. Used for internal board state,
 * where card `data` is intentionally shared by reference.
 *
 * @param column - The column to clone.
 * @returns A shallow copy.
 */
function cloneColumn<T>(column: KanbanColumn<T>): KanbanColumn<T> {
  return { ...column, cards: [...column.cards] }
}

/**
 * Deep-clones a value for snapshot isolation of card `data`. Uses the
 * `structuredClone` global (available on Node >= 17, always present on the
 * Node >= 20 baseline), so honoring `cloneCardData` needs no extra dependency.
 *
 * @param value - The value to clone.
 * @returns A structurally-equal, reference-independent copy.
 */
function deepClone<T>(value: T): T {
  return structuredClone(value)
}

// ---------------------------------------------------------------------------
// Instance factory
// ---------------------------------------------------------------------------

/**
 * Creates a KanbanInstance managing board state in memory.
 *
 * @param options - Kanban board configuration from the core interface.
 * @param config - Provider-specific configuration (e.g. `cloneCardData`).
 * @returns A KanbanInstance.
 */
function createInstance<T>(
  options: KanbanOptions<T>,
  config: DefaultKanbanConfig,
): KanbanInstance<T> {
  const cloneCardData = config.cloneCardData ?? false
  let columns: KanbanColumn<T>[] = options.columns.map(cloneColumn)
  let activeCardId: string | null = null
  let activeColumnId: string | null = null
  let destroyed = false

  const subscribers = new Set<KanbanUpdateHandler<T>>()

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Produces a snapshot copy of a card. When `cloneCardData` is enabled the
   * card's `data` payload is deep-cloned so callers may mutate returned data
   * without affecting internal board state; otherwise `data` is shared by
   * reference (the card object itself is always a fresh shallow copy).
   *
   * @param card - The internal card to snapshot.
   * @returns A card safe to hand back to callers.
   */
  function snapshotCard(card: KanbanCard<T>): KanbanCard<T> {
    return cloneCardData ? { ...card, data: deepClone(card.data) } : { ...card }
  }

  /**
   * Produces a snapshot copy of a column, with snapshot copies of its cards.
   *
   * @param column - The internal column to snapshot.
   * @returns A column safe to hand back to callers.
   */
  function snapshotColumn(column: KanbanColumn<T>): KanbanColumn<T> {
    return { ...column, cards: column.cards.map(snapshotCard) }
  }

  /**
   * Builds a state snapshot from the current board data.
   *
   * @returns A state snapshot honoring `cloneCardData`.
   */
  function buildState(): KanbanState<T> {
    return {
      columns: columns.map(snapshotColumn),
      activeCardId,
      activeColumnId,
    }
  }

  /**
   * Emits the current state to all subscribers.
   */
  function emit(): void {
    if (destroyed) return
    const state = buildState()
    for (const handler of subscribers) {
      handler(state)
    }
  }

  /**
   * Finds a column by id.
   *
   * @param columnId - The column identifier.
   * @returns The column, or `undefined`.
   */
  function findColumn(columnId: string): KanbanColumn<T> | undefined {
    return columns.find((c) => c.id === columnId)
  }

  /**
   * Finds a card across all columns.
   *
   * @param cardId - The card identifier.
   * @returns The card and its parent column, or `undefined`.
   */
  function findCardInternal(
    cardId: string,
  ): { card: KanbanCard<T>; column: KanbanColumn<T>; index: number } | undefined {
    for (const col of columns) {
      const idx = col.cards.findIndex((c) => c.id === cardId)
      if (idx !== -1) {
        return { card: col.cards[idx], column: col, index: idx }
      }
    }
    return undefined
  }

  // -------------------------------------------------------------------------
  // Instance
  // -------------------------------------------------------------------------

  const instance: KanbanInstance<T> = {
    // -- Query ---------------------------------------------------------------

    getColumns(): KanbanColumn<T>[] {
      return columns.map(snapshotColumn)
    },

    getColumn(columnId: string): KanbanColumn<T> | undefined {
      const col = findColumn(columnId)
      return col ? snapshotColumn(col) : undefined
    },

    findCard(cardId: string): { card: KanbanCard<T>; columnId: string } | undefined {
      const result = findCardInternal(cardId)
      if (!result) return undefined
      return { card: snapshotCard(result.card), columnId: result.column.id }
    },

    // -- Card mutations ------------------------------------------------------

    addCard(columnId: string, card: KanbanCard<T>, position?: number): void {
      if (destroyed) return
      const col = findColumn(columnId)
      if (!col) return
      const pos = position ?? col.cards.length
      col.cards.splice(pos, 0, { ...card })
      emit()
    },

    removeCard(cardId: string): void {
      if (destroyed) return
      const result = findCardInternal(cardId)
      if (!result) return
      result.column.cards.splice(result.index, 1)
      emit()
    },

    moveCard(cardId: string, toColumnId: string, position: number): void {
      if (destroyed) return
      const result = findCardInternal(cardId)
      if (!result) return
      const toCol = findColumn(toColumnId)
      if (!toCol) return

      const fromColumnId = result.column.id
      // Remove from source
      result.column.cards.splice(result.index, 1)
      // Insert into destination
      toCol.cards.splice(position, 0, result.card)

      options.onCardMove(cardId, fromColumnId, toColumnId, position)
      emit()
    },

    updateCard(cardId: string, data: T): void {
      if (destroyed) return
      const result = findCardInternal(cardId)
      if (!result) return
      result.card.data = data
      emit()
    },

    // -- Column mutations ----------------------------------------------------

    addColumn(column: KanbanColumn<T>, position?: number): void {
      if (destroyed) return
      const pos = position ?? columns.length
      columns.splice(pos, 0, cloneColumn(column))
      emit()
    },

    removeColumn(columnId: string): void {
      if (destroyed) return
      columns = columns.filter((c) => c.id !== columnId)
      emit()
    },

    reorderColumns(columnIds: string[]): void {
      if (destroyed) return
      const map = new Map(columns.map((c) => [c.id, c]))
      const reordered: KanbanColumn<T>[] = []
      for (const id of columnIds) {
        const col = map.get(id)
        if (col) reordered.push(col)
      }
      columns = reordered
      options.onColumnReorder?.(columnIds)
      emit()
    },

    updateColumn(
      columnId: string,
      updates: Partial<Pick<KanbanColumn<T>, 'title' | 'limit' | 'color'>>,
    ): void {
      if (destroyed) return
      const col = findColumn(columnId)
      if (!col) return
      if (updates.title !== undefined) col.title = updates.title
      if (updates.limit !== undefined) col.limit = updates.limit
      if (updates.color !== undefined) col.color = updates.color
      emit()
    },

    // -- Drag state ----------------------------------------------------------

    setActiveCard(cardId: string | null): void {
      if (destroyed) return
      activeCardId = cardId
      emit()
    },

    setActiveColumn(columnId: string | null): void {
      if (destroyed) return
      activeColumnId = columnId
      emit()
    },

    // -- Subscriptions -------------------------------------------------------

    onUpdate(handler: KanbanUpdateHandler<T>): void {
      subscribers.add(handler)
    },

    offUpdate(handler: KanbanUpdateHandler<T>): void {
      subscribers.delete(handler)
    },

    // -- Lifecycle -----------------------------------------------------------

    getState(): KanbanState<T> {
      return buildState()
    },

    destroy(): void {
      if (destroyed) return
      destroyed = true
      subscribers.clear()
      columns = []
      activeCardId = null
      activeColumnId = null
    },
  }

  return instance
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Creates a default kanban provider.
 *
 * @param config - Optional provider-specific configuration. Set
 *   `cloneCardData: true` to deep-clone each card's `data` in every returned
 *   snapshot (see {@link DefaultKanbanConfig}).
 * @returns A `KanbanProvider` backed by in-memory state management.
 *
 * @example
 * ```typescript
 * import { createDefaultProvider } from '@molecule/app-kanban-default'
 * import { setProvider } from '@molecule/app-kanban'
 *
 * setProvider(createDefaultProvider())
 * ```
 */
export function createDefaultProvider(config: DefaultKanbanConfig = {}): KanbanProvider {
  return {
    createBoard<T>(options: KanbanOptions<T>): KanbanInstance<T> {
      return createInstance(options, config)
    },
  }
}

/** Default kanban provider instance. */
export const provider: KanbanProvider = createDefaultProvider()
