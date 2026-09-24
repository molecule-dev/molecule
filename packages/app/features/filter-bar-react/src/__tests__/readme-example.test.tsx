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
import { classMap } from '@molecule/app-ui-tailwind'

import { FilterBar, type FilterField, type FilterValues } from '../index.js'

const fields: FilterField[] = [
  { id: 'search', type: 'text', label: 'Search' },
  {
    id: 'status',
    type: 'select',
    label: 'Status',
    options: [
      { value: '', label: 'Any status' },
      { value: 'open', label: 'Open' },
      { value: 'closed', label: 'Closed' },
    ],
  },
  { id: 'created', type: 'date-range', label: 'Created' },
]

const issues = [
  { id: 1, title: 'Login fails on Safari', status: 'open', created: '2026-03-02' },
  { id: 2, title: 'Typo on pricing page', status: 'closed', created: '2026-01-15' },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered filtered issue list.
 */
function IssueList(): React.JSX.Element {
  const [values, setValues] = useState<FilterValues>({})
  const search = typeof values.search === 'string' ? values.search.toLowerCase() : ''
  const status = typeof values.status === 'string' ? values.status : ''
  const created = (values.created ?? {}) as { from?: string; to?: string }
  const visible = issues.filter(
    (i) =>
      i.title.toLowerCase().includes(search) &&
      (!status || i.status === status) &&
      (!created.from || i.created >= created.from) &&
      (!created.to || i.created <= created.to),
  )
  return (
    <section>
      <FilterBar
        fields={fields}
        values={values}
        onChange={setValues}
        onClear={() => setValues({})}
      />
      <ul>
        {visible.map((i) => (
          <li key={i.id}>{i.title}</li>
        ))}
      </ul>
    </section>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setIconSet(iconSet) // the Select's chevron icon throws without it
  })
  afterEach(() => {
    cleanup()
  })

  it('filters the list by status, date range and search, and clears', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <IssueList />
      </I18nProvider>,
    )
    const titles = (): string[] =>
      Array.from(view.container.querySelectorAll('li')).map((li) => li.textContent ?? '')
    expect(titles()).toEqual(['Login fails on Safari', 'Typo on pricing page'])

    fireEvent.change(view.getByLabelText('Status'), { target: { value: 'closed' } })
    expect(titles()).toEqual(['Typo on pricing page'])
    fireEvent.change(view.getByLabelText('Status'), { target: { value: '' } })

    fireEvent.change(view.getByLabelText('Created from'), { target: { value: '2026-02-01' } })
    expect(titles()).toEqual(['Login fails on Safari'])

    fireEvent.click(view.getByRole('button', { name: 'Clear filters' }))
    fireEvent.change(view.getByLabelText('Search'), { target: { value: 'typo' } })
    expect(titles()).toEqual(['Typo on pricing page'])
  })
})
