// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { NoteCard } from '../index.js'

interface Note {
  id: string
  title: string
  body: string
  color: string
  pinned: boolean
  updatedAt: string
}

const initialNotes: Note[] = [
  {
    id: 'n1',
    title: 'Meeting notes',
    body: 'Follow up with design team\non the new dashboard layout.',
    color: '#fef9c3',
    pinned: true,
    updatedAt: 'Jun 5, 2026',
  },
  {
    id: 'n2',
    title: 'Groceries',
    body: 'Milk, eggs, coffee',
    color: '#dbeafe',
    pinned: false,
    updatedAt: 'Jun 4, 2026',
  },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered notes board.
 */
function NotesBoard(): React.JSX.Element {
  const [notes, setNotes] = useState(initialNotes)
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <section>
      {openId && <p>Editing {openId}</p>}
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          title={note.title}
          body={note.body}
          color={note.color}
          pinned={note.pinned}
          modifiedAt={note.updatedAt}
          onClick={() => setOpenId(note.id)}
          actions={
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation() // don't also trigger the card's onClick
                setNotes((prev) => prev.filter((n) => n.id !== note.id))
              }}
            >
              Delete
            </button>
          }
        />
      ))}
    </section>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders tinted notes, opens one on click and deletes without opening', () => {
    const view = render(<NotesBoard />)
    expect(view.getAllByRole('article')).toHaveLength(2)
    expect(view.getByRole('heading', { name: 'Meeting notes' })).toBeTruthy()
    expect(view.getAllByLabelText('Pinned')).toHaveLength(1)
    expect(view.getByText('Jun 5, 2026')).toBeTruthy()
    const [first, second] = view.getAllByRole('article')
    expect(first?.getAttribute('style')).toContain('background: rgb(254, 249, 195)')

    fireEvent.click(view.getByText('Milk, eggs, coffee'))
    expect(view.getByText('Editing n2')).toBeTruthy()

    const deleteFirst = first?.querySelector('button')
    expect(deleteFirst).toBeTruthy()
    fireEvent.click(deleteFirst as HTMLButtonElement)
    expect(view.queryByText('Meeting notes')).toBeNull()
    expect(view.getByText('Editing n2')).toBeTruthy()
    expect(second?.isConnected).toBe(true)
  })
})
