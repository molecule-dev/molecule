// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, createEvent, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { KanbanBoard, type KanbanColumnData } from '../index.js'

const initialColumns: KanbanColumnData[] = [
  { id: 'todo', title: 'To Do', cards: [{ id: 'c1', title: 'Research API' }] },
  {
    id: 'doing',
    title: 'In Progress',
    cards: [{ id: 'c2', title: 'Build UI', body: 'Board + cards' }],
  },
  { id: 'done', title: 'Done', cards: [] },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered board page.
 */
function BoardPage(): React.JSX.Element {
  const [columns, setColumns] = useState(initialColumns)
  /**
   * Moves a card between columns in local state.
   *
   * @param cardId - Card being moved.
   * @param fromColumnId - Source column.
   * @param toColumnId - Target column.
   */
  function moveCard(cardId: string, fromColumnId: string, toColumnId: string): void {
    setColumns((cols) => {
      const card = cols.find((c) => c.id === fromColumnId)?.cards.find((c) => c.id === cardId)
      if (!card) return cols
      return cols.map((col) =>
        col.id === fromColumnId
          ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
          : col.id === toColumnId
            ? { ...col, cards: [...col.cards, card] }
            : col,
      )
    })
  }
  return <KanbanBoard columns={columns} onCardMove={moveCard} />
}

/**
 * Minimal DataTransfer stand-in (jsdom has none) shared between dragstart and drop.
 *
 * @returns A store-backed dataTransfer object.
 */
function makeDataTransfer(): Pick<DataTransfer, 'setData' | 'getData' | 'effectAllowed'> {
  const store = new Map<string, string>()
  return {
    effectAllowed: 'none',
    setData: (type: string, value: string) => {
      store.set(type, value)
    },
    getData: (type: string) => store.get(type) ?? '',
  }
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the columns and moves a dropped card into the target column', () => {
    const view = render(<BoardPage />)
    const sections = view.container.querySelectorAll('section')
    expect(sections).toHaveLength(3)
    const [todo, , done] = Array.from(sections)
    if (!todo || !done) throw new Error('expected three columns')
    expect(todo.textContent).toContain('Research API')
    expect(view.getByText('Board + cards')).toBeTruthy()

    const dataTransfer = makeDataTransfer()
    const cardEl = view.getByText('Research API').closest('[draggable]')
    if (!cardEl) throw new Error('card is not draggable')
    const dragStart = createEvent.dragStart(cardEl)
    Object.defineProperty(dragStart, 'dataTransfer', { value: dataTransfer })
    fireEvent(cardEl, dragStart)
    const drop = createEvent.drop(done)
    Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer })
    fireEvent(done, drop)

    const after = view.container.querySelectorAll('section')
    expect(after[0]?.textContent).not.toContain('Research API')
    expect(after[2]?.textContent).toContain('Research API')
  })
})
