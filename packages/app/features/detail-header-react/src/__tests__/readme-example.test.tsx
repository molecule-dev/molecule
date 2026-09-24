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

import { t } from '@molecule/app-i18n'
import { StatusBadge } from '@molecule/app-status-badge-react'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'
import { classMap } from '@molecule/app-ui-tailwind'

import { DetailHeader } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered project header.
 */
function ProjectHeader(): React.JSX.Element {
  const cm = getClassMap()
  const project = { name: 'Project Alpha', updated: 'Updated 2 hours ago', owner: 'Alice Chen' }
  const [editing, setEditing] = useState(false)
  return (
    <DetailHeader
      title={project.name}
      subtitle={project.updated}
      status={
        <StatusBadge kind="success">
          {t('status.active', undefined, { defaultValue: 'Active' })}
        </StatusBadge>
      }
      actions={
        <Button variant="solid" onClick={() => setEditing(true)} disabled={editing}>
          {t('common.edit', undefined, { defaultValue: 'Edit' })}
        </Button>
      }
      meta={<span>{project.owner}</span>}
      sticky
      className={cm.surface}
      dataMolId="project-header"
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders a sticky surfaced header with title, status, meta and actions', () => {
    const view = render(<ProjectHeader />)
    const header = view.container.querySelector('[data-mol-id="project-header"]') as HTMLElement
    expect(header.tagName).toBe('HEADER')
    expect(header.style.position).toBe('sticky')
    expect(header.className).toContain(classMap.surface)
    expect(view.getByRole('heading', { level: 1, name: 'Project Alpha' })).toBeTruthy()
    expect(view.getByText('Updated 2 hours ago')).toBeTruthy()
    expect(view.getByText('Active')).toBeTruthy()
    expect(view.getByText('Alice Chen')).toBeTruthy()
  })

  it('wires the action button', () => {
    const view = render(<ProjectHeader />)
    const edit = view.getByRole('button', { name: 'Edit' }) as HTMLButtonElement
    fireEvent.click(edit)
    expect(edit.disabled).toBe(true)
  })
})
