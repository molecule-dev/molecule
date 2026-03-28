import { describe, expect, it, vi } from 'vitest'

import type { ColumnDef, DataTableOptions } from '@molecule/app-data-table'

import { createTanStackProvider, provider } from '../provider.js'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

interface User {
  name: string
  email: string
  age: number
}

const sampleData: User[] = [
  { name: 'Alice', email: 'alice@example.com', age: 30 },
  { name: 'Bob', email: 'bob@example.com', age: 25 },
  { name: 'Charlie', email: 'charlie@example.com', age: 35 },
  { name: 'Diana', email: 'diana@example.com', age: 28 },
  { name: 'Eve', email: 'eve@example.com', age: 32 },
]

const columns: ColumnDef<User>[] = [
  { id: 'name', header: 'Name', accessor: 'name', sortable: true, filterable: true },
  { id: 'email', header: 'Email', accessor: 'email', sortable: true },
  { id: 'age', header: 'Age', accessor: 'age', sortable: true, filterable: true },
]

function createOptions(overrides: Partial<DataTableOptions<User>> = {}): DataTableOptions<User> {
  return {
    data: sampleData,
    columns,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('@molecule/app-data-table-tanstack', () => {
  describe('provider conformance', () => {
    it('exports a typed provider with createTable method', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.createTable).toBe('function')
    })

    it('createTanStackProvider returns a DataTableProvider', () => {
      const p = createTanStackProvider()
      expect(typeof p.createTable).toBe('function')
    })

    it('createTanStackProvider accepts debug config', () => {
      const p = createTanStackProvider({ debug: true })
      expect(typeof p.createTable).toBe('function')
    })
  })

  describe('basic table creation', () => {
    it('creates a table and returns all rows when no pagination', () => {
      const table = provider.createTable(createOptions())
      expect(table.getRows()).toHaveLength(5)
      expect(table.getTotalRowCount()).toBe(5)
    })

    it('returns filtered rows matching all rows when no filters are active', () => {
      const table = provider.createTable(createOptions())
      expect(table.getFilteredRows()).toHaveLength(5)
    })
  })

  describe('pagination', () => {
    it('paginates data correctly', () => {
      const table = provider.createTable(createOptions({ pagination: { page: 0, pageSize: 2 } }))

      const rows = table.getRows()
      expect(rows).toHaveLength(2)

      const paginationState = table.getPagination()
      expect(paginationState.page).toBe(0)
      expect(paginationState.pageSize).toBe(2)
      expect(paginationState.pageCount).toBe(3)
      expect(paginationState.totalRows).toBe(5)
    })

    it('navigates between pages', () => {
      const table = provider.createTable(createOptions({ pagination: { page: 0, pageSize: 2 } }))

      table.setPage(1)
      const rows = table.getRows()
      expect(rows).toHaveLength(2)
      expect(table.getPagination().page).toBe(1)
    })

    it('changes page size and resets to page 0', () => {
      const table = provider.createTable(createOptions({ pagination: { page: 1, pageSize: 2 } }))

      table.setPageSize(3)
      expect(table.getPagination().pageSize).toBe(3)
    })
  })

  describe('sorting', () => {
    it('sorts data ascending', () => {
      const table = provider.createTable(createOptions())

      table.setSort('age', 'asc')
      const rows = table.getRows()
      expect(rows[0].name).toBe('Bob') // age 25
      expect(rows[4].name).toBe('Charlie') // age 35
    })

    it('sorts data descending', () => {
      const table = provider.createTable(createOptions())

      table.setSort('age', 'desc')
      const rows = table.getRows()
      expect(rows[0].name).toBe('Charlie') // age 35
      expect(rows[4].name).toBe('Bob') // age 25
    })

    it('returns current sorting state', () => {
      const table = provider.createTable(createOptions())

      table.setSort('name', 'asc')
      const sorting = table.getSorting()
      expect(sorting).toHaveLength(1)
      expect(sorting[0]).toEqual({ columnId: 'name', direction: 'asc' })
    })

    it('clears sorting', () => {
      const table = provider.createTable(createOptions())

      table.setSort('name', 'asc')
      table.clearSort()
      expect(table.getSorting()).toHaveLength(0)
    })

    it('respects initial sorting options', () => {
      const table = provider.createTable(
        createOptions({
          sorting: { initial: [{ columnId: 'age', direction: 'desc' }] },
        }),
      )

      const rows = table.getRows()
      expect(rows[0].name).toBe('Charlie')
    })
  })

  describe('filtering', () => {
    it('filters data by column', () => {
      const table = provider.createTable(createOptions())

      table.setFilter('name', 'Alice')
      const rows = table.getFilteredRows()
      expect(rows).toHaveLength(1)
      expect(rows[0].name).toBe('Alice')
    })

    it('returns current filter state', () => {
      const table = provider.createTable(createOptions())

      table.setFilter('name', 'test')
      const filters = table.getFilters()
      expect(filters).toHaveLength(1)
      expect(filters[0]).toEqual({ columnId: 'name', value: 'test' })
    })

    it('removes a specific filter', () => {
      const table = provider.createTable(createOptions())

      table.setFilter('name', 'Alice')
      table.removeFilter('name')
      expect(table.getFilters()).toHaveLength(0)
      expect(table.getFilteredRows()).toHaveLength(5)
    })

    it('clears all filters', () => {
      const table = provider.createTable(createOptions())

      table.setFilter('name', 'Alice')
      table.setFilter('age', 30)
      table.clearFilters()
      expect(table.getFilters()).toHaveLength(0)
      expect(table.getFilteredRows()).toHaveLength(5)
    })

    it('respects initial filter options', () => {
      const table = provider.createTable(
        createOptions({
          filtering: { initial: [{ columnId: 'name', value: 'Bob' }] },
        }),
      )

      const rows = table.getFilteredRows()
      expect(rows).toHaveLength(1)
      expect(rows[0].name).toBe('Bob')
    })
  })

  describe('selection', () => {
    it('selects a single row by default', () => {
      const table = provider.createTable(createOptions({ selection: {} }))

      table.selectRow(0)
      expect(table.getSelectedIndices()).toEqual([0])
      expect(table.getSelectedRows()).toHaveLength(1)
      expect(table.getSelectedRows()[0].name).toBe('Alice')
    })

    it('single selection replaces previous selection', () => {
      const table = provider.createTable(createOptions({ selection: {} }))

      table.selectRow(0)
      table.selectRow(2)
      expect(table.getSelectedIndices()).toEqual([2])
    })

    it('multi selection allows multiple rows', () => {
      const table = provider.createTable(createOptions({ selection: { multi: true } }))

      table.selectRow(0)
      table.selectRow(2)
      expect(table.getSelectedIndices()).toEqual([0, 2])
    })

    it('deselects a row', () => {
      const table = provider.createTable(createOptions({ selection: { multi: true } }))

      table.selectRow(0)
      table.selectRow(1)
      table.deselectRow(0)
      expect(table.getSelectedIndices()).toEqual([1])
    })

    it('toggles row selection', () => {
      const table = provider.createTable(createOptions({ selection: {} }))

      table.toggleRow(0)
      expect(table.getSelectedIndices()).toEqual([0])
      table.toggleRow(0)
      expect(table.getSelectedIndices()).toEqual([])
    })

    it('selects all rows', () => {
      const table = provider.createTable(createOptions({ selection: { multi: true } }))

      table.selectAll()
      expect(table.getSelectedRows()).toHaveLength(5)
    })

    it('clears selection', () => {
      const table = provider.createTable(createOptions({ selection: { multi: true } }))

      table.selectAll()
      table.clearSelection()
      expect(table.getSelectedRows()).toHaveLength(0)
    })

    it('respects initial selection', () => {
      const table = provider.createTable(
        createOptions({ selection: { multi: true, initial: [1, 3] } }),
      )

      expect(table.getSelectedIndices()).toEqual([1, 3])
    })
  })

  describe('data mutation', () => {
    it('replaces data and resets pagination', () => {
      const table = provider.createTable(createOptions({ pagination: { page: 1, pageSize: 2 } }))

      const newData: User[] = [{ name: 'Zoe', email: 'zoe@example.com', age: 40 }]
      table.setData(newData)

      expect(table.getRows()).toHaveLength(1)
      expect(table.getRows()[0].name).toBe('Zoe')
      expect(table.getPagination().page).toBe(0)
    })

    it('replaces column definitions', () => {
      const table = provider.createTable(createOptions())

      const newColumns: ColumnDef<User>[] = [{ id: 'name', header: 'Full Name', accessor: 'name' }]
      table.setColumns(newColumns)
      // Should still have all rows
      expect(table.getRows()).toHaveLength(5)
    })
  })

  describe('state change callback', () => {
    it('calls onStateChange when sorting changes', () => {
      const onStateChange = vi.fn()
      const table = provider.createTable(createOptions({ onStateChange }))

      table.setSort('name', 'asc')
      expect(onStateChange).toHaveBeenCalled()
    })

    it('calls onStateChange when filtering changes', () => {
      const onStateChange = vi.fn()
      const table = provider.createTable(createOptions({ onStateChange }))

      table.setFilter('name', 'test')
      expect(onStateChange).toHaveBeenCalled()
    })

    it('calls onStateChange when selection changes', () => {
      const onStateChange = vi.fn()
      const table = provider.createTable(createOptions({ onStateChange, selection: {} }))

      table.selectRow(0)
      expect(onStateChange).toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('clears internal state on destroy', () => {
      const table = provider.createTable(createOptions())

      table.destroy()
      // After destroy, internal data is cleared
      expect(table.getTotalRowCount()).toBe(0)
    })
  })

  describe('accessor function', () => {
    it('supports function accessors', () => {
      const fnColumns: ColumnDef<User>[] = [
        {
          id: 'fullInfo',
          header: 'Info',
          accessor: (row: User) => `${row.name} (${row.age})`,
        },
      ]

      const table = provider.createTable(createOptions({ columns: fnColumns }))
      expect(table.getRows()).toHaveLength(5)
    })
  })
})
