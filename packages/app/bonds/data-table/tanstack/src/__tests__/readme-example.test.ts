/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { createTable, setProvider } from '@molecule/app-data-table'

import { createTanStackProvider } from '../index.js'

interface Order {
  id: string
  customer: string
  total: number
}

describe('README @example', () => {
  it('bonds TanStack and sorts, paginates and filters through the core', () => {
    setProvider(createTanStackProvider())

    const orders: Order[] = [
      { id: 'o1', customer: 'Ada', total: 120 },
      { id: 'o2', customer: 'Grace', total: 80 },
      { id: 'o3', customer: 'Alan', total: 200 },
    ]

    const onStateChange = vi.fn()
    const table = createTable<Order>({
      data: orders,
      columns: [
        {
          id: 'customer',
          header: 'Customer',
          accessor: 'customer',
          filterable: true,
        },
        {
          id: 'total',
          header: 'Total',
          accessor: 'total',
          sortable: true,
        },
      ],
      pagination: { page: 0, pageSize: 2 },
      onStateChange,
    })

    table.setSort('total', 'desc')
    expect(table.getRows().map((o) => o.customer)).toEqual(['Alan', 'Ada'])
    expect(table.getPagination()).toMatchObject({ page: 0, pageSize: 2, pageCount: 2 })

    table.setFilter('customer', 'al')
    expect(table.getRows().map((o) => o.customer)).toEqual(['Alan'])
    expect(onStateChange).toHaveBeenCalled()

    table.destroy()
  })
})
