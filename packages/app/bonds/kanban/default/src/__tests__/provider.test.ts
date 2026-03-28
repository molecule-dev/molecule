import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { KanbanInstance } from '@molecule/app-kanban'

import { createDefaultProvider, provider } from '../provider.js'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Default kanban provider', () => {
  it('exports a provider constant', () => {
    expect(provider).toBeDefined()
    expect(typeof provider.createBoard).toBe('function')
  })

  it('createDefaultProvider creates a fresh provider', () => {
    const p = createDefaultProvider()
    expect(typeof p.createBoard).toBe('function')
  })

  it('createDefaultProvider accepts optional config', () => {
    const p = createDefaultProvider({ cloneCardData: true })
    expect(typeof p.createBoard).toBe('function')
  })
})

describe('KanbanInstance (default provider)', () => {
  let board: KanbanInstance<string>
  const onCardMove =
    vi.fn<(cardId: string, fromColumnId: string, toColumnId: string, position: number) => void>()
  const onColumnReorder = vi.fn<(columnIds: string[]) => void>()

  beforeEach(() => {
    onCardMove.mockClear()
    onColumnReorder.mockClear()
    board = provider.createBoard<string>({
      columns: [
        {
          id: 'todo',
          title: 'To Do',
          cards: [
            { id: 'card-1', data: 'Task A' },
            { id: 'card-2', data: 'Task B' },
          ],
        },
        {
          id: 'in-progress',
          title: 'In Progress',
          cards: [{ id: 'card-3', data: 'Task C' }],
          limit: 3,
        },
        { id: 'done', title: 'Done', cards: [], color: 'green' },
      ],
      onCardMove,
      onColumnReorder,
    })
  })

  // -- Query ---------------------------------------------------------------

  describe('getColumns', () => {
    it('returns all columns', () => {
      const cols = board.getColumns()
      expect(cols).toHaveLength(3)
      expect(cols[0].id).toBe('todo')
      expect(cols[1].id).toBe('in-progress')
      expect(cols[2].id).toBe('done')
    })

    it('returns a defensive copy', () => {
      const cols1 = board.getColumns()
      const cols2 = board.getColumns()
      expect(cols1).not.toBe(cols2)
      expect(cols1[0].cards).not.toBe(cols2[0].cards)
    })
  })

  describe('getColumn', () => {
    it('returns a column by id', () => {
      const col = board.getColumn('todo')
      expect(col).toBeDefined()
      expect(col!.title).toBe('To Do')
      expect(col!.cards).toHaveLength(2)
    })

    it('returns undefined for unknown id', () => {
      expect(board.getColumn('nonexistent')).toBeUndefined()
    })
  })

  describe('findCard', () => {
    it('finds a card across columns', () => {
      const result = board.findCard('card-3')
      expect(result).toBeDefined()
      expect(result!.card.data).toBe('Task C')
      expect(result!.columnId).toBe('in-progress')
    })

    it('returns undefined for unknown card', () => {
      expect(board.findCard('nonexistent')).toBeUndefined()
    })
  })

  // -- Card mutations ------------------------------------------------------

  describe('addCard', () => {
    it('appends a card to a column by default', () => {
      board.addCard('done', { id: 'card-4', data: 'Task D' })
      const col = board.getColumn('done')
      expect(col!.cards).toHaveLength(1)
      expect(col!.cards[0].id).toBe('card-4')
    })

    it('inserts at specific position', () => {
      board.addCard('todo', { id: 'card-4', data: 'Task D' }, 0)
      const col = board.getColumn('todo')
      expect(col!.cards[0].id).toBe('card-4')
      expect(col!.cards[1].id).toBe('card-1')
    })

    it('does nothing for unknown column', () => {
      board.addCard('nonexistent', { id: 'card-4', data: 'Task D' })
      // No error, no change
      expect(board.getColumns()).toHaveLength(3)
    })

    it('emits update', () => {
      const handler = vi.fn()
      board.onUpdate(handler)
      board.addCard('done', { id: 'card-4', data: 'Task D' })
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('removeCard', () => {
    it('removes a card from its column', () => {
      board.removeCard('card-1')
      expect(board.findCard('card-1')).toBeUndefined()
      expect(board.getColumn('todo')!.cards).toHaveLength(1)
    })

    it('does nothing for unknown card', () => {
      board.removeCard('nonexistent')
      expect(board.getColumn('todo')!.cards).toHaveLength(2)
    })

    it('emits update', () => {
      const handler = vi.fn()
      board.onUpdate(handler)
      board.removeCard('card-1')
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('moveCard', () => {
    it('moves a card between columns', () => {
      board.moveCard('card-1', 'in-progress', 0)

      expect(board.getColumn('todo')!.cards).toHaveLength(1)
      expect(board.getColumn('in-progress')!.cards).toHaveLength(2)
      expect(board.getColumn('in-progress')!.cards[0].id).toBe('card-1')
    })

    it('moves a card within the same column', () => {
      board.moveCard('card-1', 'todo', 1)
      const cards = board.getColumn('todo')!.cards
      expect(cards[0].id).toBe('card-2')
      expect(cards[1].id).toBe('card-1')
    })

    it('calls onCardMove callback', () => {
      board.moveCard('card-1', 'in-progress', 0)
      expect(onCardMove).toHaveBeenCalledWith('card-1', 'todo', 'in-progress', 0)
    })

    it('does nothing for unknown card', () => {
      board.moveCard('nonexistent', 'done', 0)
      expect(onCardMove).not.toHaveBeenCalled()
    })

    it('does nothing for unknown destination column', () => {
      board.moveCard('card-1', 'nonexistent', 0)
      expect(onCardMove).not.toHaveBeenCalled()
      expect(board.findCard('card-1')!.columnId).toBe('todo')
    })

    it('emits update', () => {
      const handler = vi.fn()
      board.onUpdate(handler)
      board.moveCard('card-1', 'done', 0)
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateCard', () => {
    it('updates card data', () => {
      board.updateCard('card-1', 'Updated Task A')
      expect(board.findCard('card-1')!.card.data).toBe('Updated Task A')
    })

    it('does nothing for unknown card', () => {
      board.updateCard('nonexistent', 'No Op')
      // No error
    })

    it('emits update', () => {
      const handler = vi.fn()
      board.onUpdate(handler)
      board.updateCard('card-1', 'Updated')
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  // -- Column mutations ----------------------------------------------------

  describe('addColumn', () => {
    it('appends a column by default', () => {
      board.addColumn({ id: 'review', title: 'Review', cards: [] })
      expect(board.getColumns()).toHaveLength(4)
      expect(board.getColumns()[3].id).toBe('review')
    })

    it('inserts at specific position', () => {
      board.addColumn({ id: 'review', title: 'Review', cards: [] }, 1)
      expect(board.getColumns()[1].id).toBe('review')
    })

    it('emits update', () => {
      const handler = vi.fn()
      board.onUpdate(handler)
      board.addColumn({ id: 'review', title: 'Review', cards: [] })
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('removeColumn', () => {
    it('removes a column and its cards', () => {
      board.removeColumn('todo')
      expect(board.getColumns()).toHaveLength(2)
      expect(board.getColumn('todo')).toBeUndefined()
    })

    it('does nothing for unknown column', () => {
      board.removeColumn('nonexistent')
      expect(board.getColumns()).toHaveLength(3)
    })

    it('emits update', () => {
      const handler = vi.fn()
      board.onUpdate(handler)
      board.removeColumn('done')
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('reorderColumns', () => {
    it('reorders columns', () => {
      board.reorderColumns(['done', 'in-progress', 'todo'])
      const ids = board.getColumns().map((c) => c.id)
      expect(ids).toEqual(['done', 'in-progress', 'todo'])
    })

    it('calls onColumnReorder callback', () => {
      board.reorderColumns(['done', 'in-progress', 'todo'])
      expect(onColumnReorder).toHaveBeenCalledWith(['done', 'in-progress', 'todo'])
    })

    it('drops unknown column ids gracefully', () => {
      board.reorderColumns(['done', 'nonexistent', 'todo'])
      const ids = board.getColumns().map((c) => c.id)
      expect(ids).toEqual(['done', 'todo'])
    })

    it('emits update', () => {
      const handler = vi.fn()
      board.onUpdate(handler)
      board.reorderColumns(['done', 'todo', 'in-progress'])
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('updateColumn', () => {
    it('updates column title', () => {
      board.updateColumn('todo', { title: 'Backlog' })
      expect(board.getColumn('todo')!.title).toBe('Backlog')
    })

    it('updates column limit', () => {
      board.updateColumn('todo', { limit: 5 })
      expect(board.getColumn('todo')!.limit).toBe(5)
    })

    it('updates column color', () => {
      board.updateColumn('todo', { color: 'red' })
      expect(board.getColumn('todo')!.color).toBe('red')
    })

    it('updates multiple properties at once', () => {
      board.updateColumn('todo', { title: 'Backlog', limit: 10, color: 'blue' })
      const col = board.getColumn('todo')!
      expect(col.title).toBe('Backlog')
      expect(col.limit).toBe(10)
      expect(col.color).toBe('blue')
    })

    it('does nothing for unknown column', () => {
      board.updateColumn('nonexistent', { title: 'No Op' })
      // No error
    })

    it('emits update', () => {
      const handler = vi.fn()
      board.onUpdate(handler)
      board.updateColumn('todo', { title: 'Changed' })
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  // -- Drag state ----------------------------------------------------------

  describe('setActiveCard / setActiveColumn', () => {
    it('sets and clears active card', () => {
      board.setActiveCard('card-1')
      expect(board.getState().activeCardId).toBe('card-1')

      board.setActiveCard(null)
      expect(board.getState().activeCardId).toBeNull()
    })

    it('sets and clears active column', () => {
      board.setActiveColumn('todo')
      expect(board.getState().activeColumnId).toBe('todo')

      board.setActiveColumn(null)
      expect(board.getState().activeColumnId).toBeNull()
    })

    it('emits update on drag state change', () => {
      const handler = vi.fn()
      board.onUpdate(handler)
      board.setActiveCard('card-1')
      board.setActiveColumn('todo')
      expect(handler).toHaveBeenCalledTimes(2)
    })
  })

  // -- Subscriptions -------------------------------------------------------

  describe('onUpdate / offUpdate', () => {
    it('notifies subscribers on state change', () => {
      const handler = vi.fn()
      board.onUpdate(handler)

      board.addCard('done', { id: 'card-x', data: 'trigger' })
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0][0]).toHaveProperty('columns')
    })

    it('stops notifying after offUpdate', () => {
      const handler = vi.fn()
      board.onUpdate(handler)
      board.addCard('done', { id: 'card-x', data: 'trigger' })
      expect(handler).toHaveBeenCalledTimes(1)

      handler.mockClear()
      board.offUpdate(handler)
      board.addCard('done', { id: 'card-y', data: 'silent' })
      expect(handler).not.toHaveBeenCalled()
    })

    it('supports multiple subscribers', () => {
      const h1 = vi.fn()
      const h2 = vi.fn()
      board.onUpdate(h1)
      board.onUpdate(h2)

      board.addCard('done', { id: 'card-x', data: 'trigger' })
      expect(h1).toHaveBeenCalledTimes(1)
      expect(h2).toHaveBeenCalledTimes(1)
    })
  })

  // -- getState ------------------------------------------------------------

  describe('getState', () => {
    it('returns current state snapshot', () => {
      const state = board.getState()
      expect(state.columns).toHaveLength(3)
      expect(state.activeCardId).toBeNull()
      expect(state.activeColumnId).toBeNull()
    })

    it('returns a defensive copy', () => {
      const s1 = board.getState()
      const s2 = board.getState()
      expect(s1).not.toBe(s2)
      expect(s1.columns).not.toBe(s2.columns)
    })
  })

  // -- Lifecycle -----------------------------------------------------------

  describe('destroy', () => {
    it('clears state and stops emitting', () => {
      const handler = vi.fn()
      board.onUpdate(handler)

      board.destroy()

      expect(board.getColumns()).toHaveLength(0)
      expect(board.getState().activeCardId).toBeNull()

      // Mutations after destroy are silent
      board.addCard('todo', { id: 'card-x', data: 'noop' })
      expect(handler).not.toHaveBeenCalled()
    })

    it('is idempotent', () => {
      board.destroy()
      expect(() => board.destroy()).not.toThrow()
    })
  })
})
