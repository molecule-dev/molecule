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

import { ListItemRow } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered project list.
 */
function ProjectList(): React.JSX.Element {
  const [projects, setProjects] = useState([
    {
      id: 'alpha',
      name: 'Project Alpha',
      edited: 'Last edited 2 hours ago',
      collaborators: 3,
      files: 12,
    },
    {
      id: 'beta',
      name: 'Project Beta',
      edited: 'Last edited yesterday',
      collaborators: 1,
      files: 4,
    },
  ])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return (
    <div role="listbox">
      {projects.map((p) => (
        <ListItemRow
          key={p.id}
          title={p.name}
          subtitle={p.edited}
          metadata={`${p.collaborators} collaborators · ${p.files} files`}
          leading={<img src={`/icons/${p.id}.svg`} alt="" width={32} height={32} />}
          selected={p.id === selectedId}
          onClick={() => setSelectedId(p.id)}
          actions={
            <button
              type="button"
              onClick={() => setProjects((ps) => ps.filter((x) => x.id !== p.id))}
            >
              Archive
            </button>
          }
        />
      ))}
    </div>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('selects a row on click and archives via the action without selecting', () => {
    const view = render(<ProjectList />)
    expect(view.getByText('3 collaborators · 12 files')).toBeTruthy()
    expect(view.getByText('Last edited yesterday')).toBeTruthy()

    const rowOf = (name: string): HTMLElement => {
      const row = view.getByText(name).closest('[role="button"]')
      if (!(row instanceof HTMLElement)) throw new Error(`no row for ${name}`)
      return row
    }
    fireEvent.click(rowOf('Project Beta'))
    expect(rowOf('Project Beta').getAttribute('aria-selected')).toBe('true')
    expect(rowOf('Project Alpha').getAttribute('aria-selected')).toBe('false')

    const archiveAlpha = view.getAllByRole('button', { name: 'Archive' })[0]
    if (!archiveAlpha) throw new Error('missing archive button')
    fireEvent.click(archiveAlpha)
    expect(view.queryByText('Project Alpha')).toBeNull()
    expect(rowOf('Project Beta').getAttribute('aria-selected')).toBe('true')
  })
})
