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

import { InboxRow } from '../index.js'

/** A message in the example inbox. */
interface Message {
  id: string
  from: string
  subject: string
  snippet: string
  receivedAt: string
  read: boolean
  starred: boolean
  attachments: number
}

/**
 * The README example, verbatim.
 *
 * @returns The inbox list.
 */
function Inbox(): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      from: 'Alice Johnson',
      subject: 'Q3 report is ready',
      snippet: 'Final numbers attached.',
      receivedAt: '10:42 AM',
      read: false,
      starred: false,
      attachments: 1,
    },
    {
      id: 'm2',
      from: 'Bob Lee',
      subject: 'Lunch?',
      snippet: 'Tacos at noon?',
      receivedAt: '9:15 AM',
      read: true,
      starred: true,
      attachments: 0,
    },
  ])
  const update = (id: string, patch: Partial<Message>): void =>
    setMessages((all) => all.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  return (
    <section>
      {messages.map((m) => (
        <InboxRow
          key={m.id}
          sender={m.from}
          subject={m.subject}
          preview={m.snippet}
          timestamp={m.receivedAt}
          unread={!m.read}
          starred={m.starred}
          hasAttachment={m.attachments > 0}
          onClick={() => update(m.id, { read: true })}
          onToggleStar={() => update(m.id, { starred: !m.starred })}
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

  it('renders one row per message, marks a row read on click and toggles the star', () => {
    const view = render(<Inbox />)
    expect(view.getByText('Q3 report is ready')).toBeTruthy()
    expect(view.getByText('— Final numbers attached.')).toBeTruthy()
    expect(view.getByText('10:42 AM')).toBeTruthy()
    expect(view.getAllByLabelText('Has attachment')).toHaveLength(1)

    const aliceRow = view.getByText('Q3 report is ready').closest('section > div')
    expect(aliceRow).toBeInstanceOf(HTMLElement)
    const row = aliceRow as HTMLElement
    expect(row.style.fontWeight).toBe('600')

    // Starring does not open (mark read) the message.
    fireEvent.click(view.getByRole('button', { name: 'Star' }))
    expect(view.getAllByRole('button', { name: 'Unstar' })).toHaveLength(2)
    expect(row.style.fontWeight).toBe('600')

    fireEvent.click(row)
    expect(row.style.fontWeight).toBe('')
  })
})
