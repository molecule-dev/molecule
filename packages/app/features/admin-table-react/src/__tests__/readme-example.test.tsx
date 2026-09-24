/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { t } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AdminTable, type AdminTableColumn } from '../index.js'

interface Product {
  id: string
  name: string
  priceCents: number
  category: string
}

/**
 * The README example, verbatim.
 *
 * @returns The rendered admin products table.
 */
function AdminProductsPage(): React.JSX.Element {
  const [products, setProducts] = useState<Product[]>([
    { id: 'p1', name: 'Desk Lamp', priceCents: 4999, category: 'Lighting' },
    { id: 'p2', name: 'Office Chair', priceCents: 18900, category: 'Furniture' },
  ])
  const [openedId, setOpenedId] = useState<string | null>(null)
  const columns: AdminTableColumn<Product>[] = [
    {
      id: 'name',
      header: t('form.name', undefined, { defaultValue: 'Name' }),
      render: (p) => p.name,
    },
    {
      id: 'price',
      header: t('form.price', undefined, { defaultValue: 'Price' }),
      render: (p) => `$${(p.priceCents / 100).toFixed(2)}`,
      align: 'right',
    },
    {
      id: 'category',
      header: t('form.category', undefined, { defaultValue: 'Category' }),
      render: (p) => p.category,
    },
  ]
  return (
    <>
      <p>{openedId}</p>
      <AdminTable
        rows={products}
        columns={columns}
        rowKey={(p) => p.id}
        onRowClick={(p) => setOpenedId(p.id)}
        bulkSelect
        tbodyDataMolId="admin-products-rows"
        rowActionsAriaLabel={() => t('nav.actions', undefined, { defaultValue: 'Actions' })}
        rowActions={[
          {
            label: t('common.edit', undefined, { defaultValue: 'Edit' }),
            hrefFor: (p) => `/admin/products/${p.id}`,
            onSelect: () => {},
          },
          {
            label: t('common.delete', undefined, { defaultValue: 'Delete' }),
            destructive: true,
            dataMolIdFor: (p) => `admin-products-delete-${p.id}`,
            onSelect: (p) => setProducts((rows) => rows.filter((r) => r.id !== p.id)),
          },
        ]}
      />
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

  it('renders headers and formatted cells for every row', () => {
    const view = render(<AdminProductsPage />)
    const headers = view.getAllByRole('columnheader').map((th) => th.textContent)
    expect(headers).toEqual(['', 'Name', 'Price', 'Category', ''])
    const tbody = view.container.querySelector('[data-mol-id="admin-products-rows"]')
    expect(tbody?.querySelectorAll('tr')).toHaveLength(2)
    expect(view.getByText('$49.99')).toBeTruthy()
    expect(view.getByText('$189.00')).toBeTruthy()
  })

  it('opens a row on click and deletes via the row-actions menu', async () => {
    const view = render(<AdminProductsPage />)
    fireEvent.click(view.getByText('Office Chair'))
    expect(view.getByText('p2')).toBeTruthy()

    fireEvent.click(view.getAllByRole('button', { name: 'Actions' })[0] as HTMLElement)
    expect(view.getByRole('link', { name: 'Edit' }).getAttribute('href')).toBe('/admin/products/p1')
    fireEvent.click(
      view.container.querySelector('[data-mol-id="admin-products-delete-p1"]') as Element,
    )
    await waitFor(() => expect(view.queryByText('Desk Lamp')).toBeNull())
    const rows = view.container.querySelectorAll('[data-mol-id="admin-products-rows"] tr')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.getAttribute('data-mol-id')).toBe('admin-table-row-p2')
  })

  it('tracks bulk selection internally', () => {
    const view = render(<AdminProductsPage />)
    const box = view.container.querySelector(
      '[data-mol-id="admin-table-select-p1"]',
    ) as HTMLInputElement
    fireEvent.click(box)
    expect(box.checked).toBe(true)
    expect(view.container.querySelector('p')?.textContent).toBe('')
  })
})
