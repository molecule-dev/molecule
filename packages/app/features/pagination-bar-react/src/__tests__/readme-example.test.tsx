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

import { PaginationBar } from '../index.js'

const orders = Array.from({ length: 123 }, (_, i) => ({ id: `ord-${i + 1}`, total: 20 + i }))

/**
 * The README example, verbatim.
 *
 * @returns The rendered paginated order list.
 */
function OrderList(): React.JSX.Element {
  const [page, setPage] = useState(1) // 1-indexed
  const [pageSize, setPageSize] = useState(10)
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize))
  const visible = orders.slice((page - 1) * pageSize, page * pageSize)
  return (
    <section>
      <ul>
        {visible.map((o) => (
          <li key={o.id}>{`${o.id} — $${o.total}`}</li>
        ))}
      </ul>
      <PaginationBar
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        total={orders.length}
        onPageChange={setPage}
        pageSizeOptions={[10, 25, 50]}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
    </section>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setIconSet(iconSet) // the page-size <Select>'s chevron throws without it
  })
  afterEach(() => {
    cleanup()
  })

  it('pages through the orders and resets to page 1 on a page-size change', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <OrderList />
      </I18nProvider>,
    )
    expect(view.getByText('Showing 1 to 10 of 123 items')).toBeTruthy()
    expect(view.getAllByRole('listitem')).toHaveLength(10)
    expect(view.getByRole('button', { name: 'Previous page' })).toHaveProperty('disabled', true)
    expect(view.getByRole('button', { name: '13' })).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Next page' }))
    expect(view.getByText('Showing 11 to 20 of 123 items')).toBeTruthy()
    expect(view.getByText('ord-11 — $30')).toBeTruthy()
    expect(view.getByRole('button', { name: '2' }).getAttribute('aria-current')).toBe('page')

    fireEvent.click(view.getByRole('button', { name: '13' }))
    expect(view.getByText('Showing 121 to 123 of 123 items')).toBeTruthy()
    expect(view.getAllByRole('listitem')).toHaveLength(3)

    fireEvent.change(view.getByRole('combobox', { name: 'Page size' }), {
      target: { value: '25' },
    })
    expect(view.getByText('Showing 1 to 25 of 123 items')).toBeTruthy()
    expect(view.getAllByRole('listitem')).toHaveLength(25)
    expect(view.getByRole('button', { name: '5' })).toBeTruthy()
  })
})
