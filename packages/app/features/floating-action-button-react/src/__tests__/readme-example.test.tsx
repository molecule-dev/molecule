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

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-react'
import { classMap } from '@molecule/app-ui-tailwind'

import { FloatingActionButton } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered notes page.
 */
function NotesPage(): React.JSX.Element {
  const [notes, setNotes] = useState<string[]>([])
  return (
    <main>
      <ul>
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      <FloatingActionButton
        icon={<Icon name="plus" size={24} />}
        label="Create new note"
        position="bottom-right"
        onClick={() => setNotes((prev) => [...prev, `Note ${prev.length + 1}`])}
      />
    </main>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setIconSet(iconSet)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders a fixed, labelled FAB with the icon and runs onClick', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <NotesPage />
      </I18nProvider>,
    )
    const fab = view.getByRole('button', { name: 'Create new note' })
    expect(fab.getAttribute('title')).toBe('Create new note')
    expect(fab.style.position).toBe('fixed')
    expect(fab.style.right).toBe('24px')
    expect(fab.style.bottom).toBe('24px')
    expect(fab.querySelector('svg')).not.toBeNull()

    fireEvent.click(fab)
    fireEvent.click(fab)
    expect(Array.from(view.container.querySelectorAll('li')).map((li) => li.textContent)).toEqual([
      'Note 1',
      'Note 2',
    ])
  })
})
