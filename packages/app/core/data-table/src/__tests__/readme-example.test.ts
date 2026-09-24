/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the TanStack bond.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { provider } from '@molecule/app-data-table-tanstack'

import { createTable, setProvider } from '../index.js'

interface User {
  id: string
  name: string
  email: string
}

describe('README @example', () => {
  it('sorts, paginates and filters rows through the bonded provider', () => {
    setProvider(provider)

    const users: User[] = [
      { id: 'u1', name: 'Grace Hopper', email: 'grace@example.com' },
      { id: 'u2', name: 'Ada Lovelace', email: 'ada@example.com' },
      { id: 'u3', name: 'Alan Turing', email: 'alan@example.com' },
    ]
    const onStateChange = vi.fn()

    const table = createTable<User>({
      data: users,
      columns: [
        { id: 'name', header: 'Name', accessor: 'name', sortable: true },
        { id: 'email', header: 'Email', accessor: 'email', filterable: true },
      ],
      pagination: { page: 0, pageSize: 2 },
      onStateChange,
    })

    table.setSort('name', 'asc')
    expect(table.getRows().map((u) => u.name)).toEqual(['Ada Lovelace', 'Alan Turing'])
    expect(onStateChange).toHaveBeenCalled()

    table.setFilter('email', 'grace')
    expect(table.getFilteredRows().map((u) => u.id)).toEqual(['u1'])
    expect(table.getPagination().totalRows).toBe(1)
    expect(table.getTotalRowCount()).toBe(3)
  })
})
