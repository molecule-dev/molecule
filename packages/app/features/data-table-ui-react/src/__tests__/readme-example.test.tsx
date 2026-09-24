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
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { DataTableCard, type DataTableColumn } from '../index.js'

interface Member {
  id: string
  name: string
  email: string
  role: string
}

/**
 * The README example, verbatim.
 *
 * @returns The rendered members table.
 */
function MembersTable(): React.JSX.Element {
  const members: Member[] = [
    { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', role: 'Owner' },
    { id: 'u2', name: 'Alan Turing', email: 'alan@example.com', role: 'Editor' },
  ]
  const [openedId, setOpenedId] = useState<string | null>(null)
  const columns: DataTableColumn<Member>[] = [
    {
      key: 'name',
      header: t('form.name', undefined, { defaultValue: 'Name' }),
      cell: (m) => m.name,
    },
    {
      key: 'email',
      header: t('settings.email', undefined, { defaultValue: 'Email' }),
      cell: (m) => m.email,
    },
    {
      key: 'role',
      header: t('form.role', undefined, { defaultValue: 'Role' }),
      cell: (m) => m.role,
    },
  ]
  return (
    <>
      <DataTableCard
        title={t('nav.members', undefined, { defaultValue: 'Members' })}
        columns={columns}
        rows={members}
        rowKey={(m) => m.id}
        onRowClick={(m) => setOpenedId(m.id)}
        emptyMessage={t('ui.table.empty', undefined, { defaultValue: 'No data available' })}
        dataMolId="members-table"
      />
      <p>{openedId}</p>
    </>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the title, headers and one row per member', () => {
    const view = render(<MembersTable />)
    expect(view.container.querySelector('[data-mol-id="members-table"]')).toBeTruthy()
    expect(view.getByRole('heading', { name: 'Members' })).toBeTruthy()
    const headers = view.getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers).toEqual(['Name', 'Email', 'Role'])
    const rows = view.container.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(Array.from(rows[1]?.querySelectorAll('td') ?? []).map((td) => td.textContent)).toEqual([
      'Alan Turing',
      'alan@example.com',
      'Editor',
    ])
    expect(view.queryByText('No data available')).toBeNull()
  })

  it('reports the clicked row', () => {
    const view = render(<MembersTable />)
    fireEvent.click(view.getByText('ada@example.com'))
    expect(view.container.querySelector('p')?.textContent).toBe('u1')
  })
})
