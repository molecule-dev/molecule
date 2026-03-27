import { beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'

import { createTable, getProvider, hasProvider, setProvider } from '../provider.js'
import type { DataTableInstance, DataTableOptions, DataTableProvider } from '../types.js'

/** Creates a minimal mock DataTableInstance. */
function createMockInstance<T>(options: DataTableOptions<T>): DataTableInstance<T> {
  let data = [...options.data]
  const selected = new Set<number>()

  return {
    getRows: () => data,
    getFilteredRows: () => data,
    getTotalRowCount: () => data.length,
    getPagination: () => ({
      page: options.pagination?.page ?? 0,
      pageSize: options.pagination?.pageSize ?? data.length,
      pageCount: 1,
      totalRows: data.length,
    }),
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    getSorting: () => [],
    setSort: vi.fn(),
    clearSort: vi.fn(),
    getFilters: () => [],
    setFilter: vi.fn(),
    removeFilter: vi.fn(),
    clearFilters: vi.fn(),
    getSelectedRows: () => data.filter((_, i) => selected.has(i)),
    getSelectedIndices: () => [...selected],
    selectRow: (i: number) => selected.add(i),
    deselectRow: (i: number) => selected.delete(i),
    toggleRow: (i: number) => (selected.has(i) ? selected.delete(i) : selected.add(i)),
    selectAll: () => data.forEach((_, i) => selected.add(i)),
    clearSelection: () => selected.clear(),
    setData: (d: T[]) => {
      data = [...d]
    },
    setColumns: vi.fn(),
    destroy: vi.fn(),
  }
}

/** Creates a mock DataTableProvider. */
function createMockProvider(): DataTableProvider {
  return {
    createTable: <T>(options: DataTableOptions<T>) => createMockInstance(options),
  }
}

describe('DataTable provider', () => {
  beforeEach(() => {
    unbond('data-table')
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('hasProvider returns false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('setProvider bonds the provider and hasProvider returns true', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })

    it('getProvider returns the bonded provider', () => {
      const mock = createMockProvider()
      setProvider(mock)
      expect(getProvider()).toBe(mock)
    })

    it('getProvider throws when no provider is bonded', () => {
      expect(() => getProvider()).toThrow('@molecule/app-data-table')
    })
  })

  describe('createTable', () => {
    it('delegates to the bonded provider', () => {
      const mock = createMockProvider()
      const spy = vi.spyOn(mock, 'createTable')
      setProvider(mock)

      const options: DataTableOptions<{ name: string }> = {
        data: [{ name: 'Alice' }, { name: 'Bob' }],
        columns: [{ id: 'name', header: 'Name', accessor: 'name' }],
      }

      const table = createTable(options)
      expect(spy).toHaveBeenCalledWith(options)
      expect(table.getRows()).toEqual([{ name: 'Alice' }, { name: 'Bob' }])
    })

    it('throws when no provider is bonded', () => {
      expect(() =>
        createTable({
          data: [],
          columns: [],
        }),
      ).toThrow('@molecule/app-data-table')
    })
  })
})

describe('DataTableInstance (mock conformance)', () => {
  let table: DataTableInstance<{ id: number; name: string }>

  beforeEach(() => {
    unbond('data-table')
    setProvider(createMockProvider())
    table = createTable({
      data: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ],
      columns: [
        { id: 'id', header: 'ID', accessor: 'id' },
        { id: 'name', header: 'Name', accessor: 'name', sortable: true },
      ],
      pagination: { page: 0, pageSize: 10 },
    })
  })

  it('getRows returns the data', () => {
    expect(table.getRows()).toHaveLength(3)
  })

  it('getTotalRowCount returns the total', () => {
    expect(table.getTotalRowCount()).toBe(3)
  })

  it('getPagination returns pagination state', () => {
    const pag = table.getPagination()
    expect(pag.page).toBe(0)
    expect(pag.pageSize).toBe(10)
    expect(pag.totalRows).toBe(3)
  })

  it('selection works: select, deselect, toggle, selectAll, clearSelection', () => {
    expect(table.getSelectedRows()).toEqual([])
    expect(table.getSelectedIndices()).toEqual([])

    table.selectRow(0)
    expect(table.getSelectedIndices()).toEqual([0])
    expect(table.getSelectedRows()).toEqual([{ id: 1, name: 'Alice' }])

    table.selectRow(2)
    expect(table.getSelectedIndices()).toContain(0)
    expect(table.getSelectedIndices()).toContain(2)

    table.deselectRow(0)
    expect(table.getSelectedIndices()).toEqual([2])

    table.toggleRow(2)
    expect(table.getSelectedIndices()).toEqual([])

    table.toggleRow(1)
    expect(table.getSelectedIndices()).toEqual([1])

    table.selectAll()
    expect(table.getSelectedIndices().sort()).toEqual([0, 1, 2])

    table.clearSelection()
    expect(table.getSelectedIndices()).toEqual([])
  })

  it('setData replaces the data', () => {
    table.setData([{ id: 99, name: 'Zed' }])
    expect(table.getRows()).toEqual([{ id: 99, name: 'Zed' }])
    expect(table.getTotalRowCount()).toBe(1)
  })

  it('getSorting returns empty by default', () => {
    expect(table.getSorting()).toEqual([])
  })

  it('getFilters returns empty by default', () => {
    expect(table.getFilters()).toEqual([])
  })

  it('destroy is callable', () => {
    expect(() => table.destroy()).not.toThrow()
  })
})
