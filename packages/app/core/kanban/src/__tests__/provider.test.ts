import { beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'

import { createBoard, getProvider, hasProvider, setProvider } from '../provider.js'
import type {
  KanbanCard,
  KanbanColumn,
  KanbanInstance,
  KanbanOptions,
  KanbanProvider,
  KanbanState,
  KanbanUpdateHandler,
} from '../types.js'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function createMockColumn<T>(
  id: string,
  title: string,
  cards: KanbanCard<T>[] = [],
): KanbanColumn<T> {
  return { id, title, cards }
}

function createMockOptions<T>(overrides?: Partial<KanbanOptions<T>>): KanbanOptions<T> {
  return {
    columns: [
      createMockColumn('todo', 'To Do', []),
      createMockColumn('done', 'Done', []),
    ] as KanbanColumn<T>[],
    onCardMove: vi.fn(),
    ...overrides,
  }
}

function createMockInstance<T>(options: KanbanOptions<T>): KanbanInstance<T> {
  let columns = options.columns.map((col) => ({
    ...col,
    cards: [...col.cards],
  }))
  let activeCardId: string | null = null
  let activeColumnId: string | null = null
  const handlers = new Set<KanbanUpdateHandler<T>>()

  function getState(): KanbanState<T> {
    return {
      columns: columns.map((c) => ({ ...c, cards: [...c.cards] })),
      activeCardId,
      activeColumnId,
    }
  }

  function emit(): void {
    const state = getState()
    for (const handler of handlers) {
      handler(state)
    }
  }

  return {
    getColumns: () => columns.map((c) => ({ ...c, cards: [...c.cards] })),
    getColumn: (columnId: string) => {
      const col = columns.find((c) => c.id === columnId)
      return col ? { ...col, cards: [...col.cards] } : undefined
    },
    findCard: (cardId: string) => {
      for (const col of columns) {
        const card = col.cards.find((c) => c.id === cardId)
        if (card) return { card: { ...card }, columnId: col.id }
      }
      return undefined
    },
    addCard: (columnId: string, card: KanbanCard<T>, position?: number) => {
      const col = columns.find((c) => c.id === columnId)
      if (!col) return
      const pos = position ?? col.cards.length
      col.cards.splice(pos, 0, card)
      emit()
    },
    removeCard: (cardId: string) => {
      for (const col of columns) {
        const idx = col.cards.findIndex((c) => c.id === cardId)
        if (idx !== -1) {
          col.cards.splice(idx, 1)
          emit()
          return
        }
      }
    },
    moveCard: (cardId: string, toColumnId: string, position: number) => {
      let card: KanbanCard<T> | undefined
      let fromColumnId: string | undefined
      for (const col of columns) {
        const idx = col.cards.findIndex((c) => c.id === cardId)
        if (idx !== -1) {
          fromColumnId = col.id
          card = col.cards.splice(idx, 1)[0]
          break
        }
      }
      if (!card || !fromColumnId) return
      const toCol = columns.find((c) => c.id === toColumnId)
      if (!toCol) return
      toCol.cards.splice(position, 0, card)
      options.onCardMove(cardId, fromColumnId, toColumnId, position)
      emit()
    },
    updateCard: (cardId: string, data: T) => {
      for (const col of columns) {
        const card = col.cards.find((c) => c.id === cardId)
        if (card) {
          card.data = data
          emit()
          return
        }
      }
    },
    addColumn: (column: KanbanColumn<T>, position?: number) => {
      const pos = position ?? columns.length
      columns.splice(pos, 0, { ...column, cards: [...column.cards] })
      emit()
    },
    removeColumn: (columnId: string) => {
      columns = columns.filter((c) => c.id !== columnId)
      emit()
    },
    reorderColumns: (columnIds: string[]) => {
      const map = new Map(columns.map((c) => [c.id, c]))
      columns = columnIds.map((id) => map.get(id)!).filter(Boolean)
      options.onColumnReorder?.(columnIds)
      emit()
    },
    updateColumn: (columnId: string, updates) => {
      const col = columns.find((c) => c.id === columnId)
      if (!col) return
      if (updates.title !== undefined) col.title = updates.title
      if (updates.limit !== undefined) col.limit = updates.limit
      if (updates.color !== undefined) col.color = updates.color
      emit()
    },
    setActiveCard: (id: string | null) => {
      activeCardId = id
      emit()
    },
    setActiveColumn: (id: string | null) => {
      activeColumnId = id
      emit()
    },
    onUpdate: (handler: KanbanUpdateHandler<T>) => {
      handlers.add(handler)
    },
    offUpdate: (handler: KanbanUpdateHandler<T>) => {
      handlers.delete(handler)
    },
    getState,
    destroy: vi.fn(),
  }
}

function createMockProvider(): KanbanProvider {
  return {
    createBoard: <T>(opts: KanbanOptions<T>) => createMockInstance(opts),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Kanban provider', () => {
  beforeEach(() => {
    unbond('kanban')
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('hasProvider returns false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('setProvider bonds the provider and hasProvider returns true', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })

    it('getProvider returns the bonded provider', () => {
      const mock = createMockProvider()
      setProvider(mock)
      expect(getProvider()).toBe(mock)
    })

    it('getProvider throws when no provider is bonded', () => {
      expect(() => getProvider()).toThrow('@molecule/app-kanban')
    })
  })

  describe('createBoard', () => {
    it('delegates to the bonded provider', () => {
      const mock = createMockProvider()
      const spy = vi.spyOn(mock, 'createBoard')
      setProvider(mock)

      const options = createMockOptions()
      const board = createBoard(options)

      expect(spy).toHaveBeenCalledWith(options)
      expect(board.getColumns()).toHaveLength(2)
    })

    it('throws when no provider is bonded', () => {
      expect(() => createBoard(createMockOptions())).toThrow('@molecule/app-kanban')
    })
  })
})

describe('KanbanInstance (mock conformance)', () => {
  let board: KanbanInstance<string>

  beforeEach(() => {
    unbond('kanban')
    setProvider(createMockProvider())
    board = createBoard<string>({
      columns: [
        { id: 'todo', title: 'To Do', cards: [{ id: 'card-1', data: 'Task A' }] },
        { id: 'in-progress', title: 'In Progress', cards: [], limit: 3 },
        { id: 'done', title: 'Done', cards: [] },
      ],
      onCardMove: vi.fn(),
      onColumnReorder: vi.fn(),
    })
  })

  // -- Query ---------------------------------------------------------------

  it('getColumns returns all columns', () => {
    expect(board.getColumns()).toHaveLength(3)
  })

  it('getColumn returns a column by id', () => {
    const col = board.getColumn('todo')
    expect(col).toBeDefined()
    expect(col!.title).toBe('To Do')
  })

  it('getColumn returns undefined for unknown id', () => {
    expect(board.getColumn('nonexistent')).toBeUndefined()
  })

  it('findCard returns card and column id', () => {
    const result = board.findCard('card-1')
    expect(result).toBeDefined()
    expect(result!.card.id).toBe('card-1')
    expect(result!.columnId).toBe('todo')
  })

  it('findCard returns undefined for unknown card', () => {
    expect(board.findCard('nonexistent')).toBeUndefined()
  })

  // -- Card mutations ------------------------------------------------------

  it('addCard adds a card to a column', () => {
    board.addCard('done', { id: 'card-2', data: 'Task B' })
    const col = board.getColumn('done')
    expect(col!.cards).toHaveLength(1)
    expect(col!.cards[0].id).toBe('card-2')
  })

  it('addCard inserts at specific position', () => {
    board.addCard('todo', { id: 'card-2', data: 'Task B' }, 0)
    const col = board.getColumn('todo')
    expect(col!.cards[0].id).toBe('card-2')
    expect(col!.cards[1].id).toBe('card-1')
  })

  it('removeCard removes a card from the board', () => {
    board.removeCard('card-1')
    expect(board.findCard('card-1')).toBeUndefined()
  })

  it('moveCard moves a card between columns', () => {
    board.moveCard('card-1', 'in-progress', 0)
    expect(board.findCard('card-1')!.columnId).toBe('in-progress')
    expect(board.getColumn('todo')!.cards).toHaveLength(0)
  })

  it('updateCard updates card data', () => {
    board.updateCard('card-1', 'Updated Task A')
    expect(board.findCard('card-1')!.card.data).toBe('Updated Task A')
  })

  // -- Column mutations ----------------------------------------------------

  it('addColumn appends a new column', () => {
    board.addColumn({ id: 'review', title: 'Review', cards: [] })
    expect(board.getColumns()).toHaveLength(4)
    expect(board.getColumn('review')).toBeDefined()
  })

  it('addColumn inserts at specific position', () => {
    board.addColumn({ id: 'review', title: 'Review', cards: [] }, 1)
    expect(board.getColumns()[1].id).toBe('review')
  })

  it('removeColumn removes a column', () => {
    board.removeColumn('done')
    expect(board.getColumns()).toHaveLength(2)
    expect(board.getColumn('done')).toBeUndefined()
  })

  it('reorderColumns reorders the columns', () => {
    board.reorderColumns(['done', 'in-progress', 'todo'])
    const ids = board.getColumns().map((c) => c.id)
    expect(ids).toEqual(['done', 'in-progress', 'todo'])
  })

  it('updateColumn updates column properties', () => {
    board.updateColumn('todo', { title: 'Backlog', limit: 10, color: 'blue' })
    const col = board.getColumn('todo')
    expect(col!.title).toBe('Backlog')
    expect(col!.limit).toBe(10)
    expect(col!.color).toBe('blue')
  })

  // -- Drag state ----------------------------------------------------------

  it('setActiveCard / setActiveColumn update state', () => {
    board.setActiveCard('card-1')
    expect(board.getState().activeCardId).toBe('card-1')

    board.setActiveColumn('todo')
    expect(board.getState().activeColumnId).toBe('todo')

    board.setActiveCard(null)
    board.setActiveColumn(null)
    expect(board.getState().activeCardId).toBeNull()
    expect(board.getState().activeColumnId).toBeNull()
  })

  // -- Subscriptions -------------------------------------------------------

  it('onUpdate / offUpdate manage subscriptions', () => {
    const handler = vi.fn()
    board.onUpdate(handler)

    board.addCard('done', { id: 'card-x', data: 'trigger' })
    expect(handler).toHaveBeenCalledTimes(1)

    handler.mockClear()
    board.offUpdate(handler)

    board.addCard('done', { id: 'card-y', data: 'no trigger' })
    expect(handler).not.toHaveBeenCalled()
  })

  // -- getState ------------------------------------------------------------

  it('getState returns current state snapshot', () => {
    const state = board.getState()
    expect(state.columns).toHaveLength(3)
    expect(state.activeCardId).toBeNull()
    expect(state.activeColumnId).toBeNull()
  })

  // -- Lifecycle -----------------------------------------------------------

  it('destroy is callable', () => {
    expect(() => board.destroy()).not.toThrow()
  })
})
