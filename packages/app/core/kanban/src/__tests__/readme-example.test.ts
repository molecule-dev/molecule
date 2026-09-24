/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the default kanban bond with
 * the persistence request's `fetch` stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { patch } from '@molecule/app-http'
import { provider } from '@molecule/app-kanban-default'

import type { KanbanUpdateHandler } from '../index.js'
import { createBoard, setProvider } from '../index.js'

interface Task {
  title: string
}

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('moves a card, notifies subscribers and persists the move', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => {
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(provider)

    const board = createBoard<Task>({
      columns: [
        { id: 'todo', title: 'To Do', cards: [{ id: 'c1', data: { title: 'Write spec' } }] },
        { id: 'doing', title: 'In Progress', cards: [], limit: 3 },
        { id: 'done', title: 'Done', cards: [] },
      ],
      onCardMove: (cardId, _fromColumnId, toColumnId, position) => {
        void patch(`/cards/${cardId}`, { columnId: toColumnId, position })
      },
    })

    const rendered: string[][] = []
    const render: KanbanUpdateHandler<Task> = (state) =>
      rendered.push(state.columns.map((column) => `${column.id}:${column.cards.length}`))
    board.onUpdate(render)

    board.moveCard('c1', 'doing', 0)
    expect(rendered).toEqual([['todo:0', 'doing:1', 'done:0']])
    expect(board.findCard('c1')?.columnId).toBe('doing')

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/cards/c1')
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toEqual({ columnId: 'doing', position: 0 })

    board.offUpdate(render)
    board.moveCard('c1', 'done', 0)
    expect(rendered).toHaveLength(1)
  })
})
