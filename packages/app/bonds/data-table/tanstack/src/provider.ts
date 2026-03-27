/**
 * TanStack Table implementation of the molecule DataTableProvider.
 *
 * Wraps `@tanstack/table-core` to provide sorting, filtering, pagination,
 * and row selection through the framework-agnostic data table interface.
 *
 * @module
 */

import type {
  ColumnDef as TanStackColumnDef,
  ColumnFiltersState,
  PaginationState as TanStackPaginationState,
  RowSelectionState,
  SortingState as TanStackSortingState,
  TableOptionsResolved,
} from '@tanstack/table-core'
import {
  createTable as createTanStackTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/table-core'

import type {
  ColumnDef,
  DataTableInstance,
  DataTableOptions,
  DataTableProvider,
  FilterState,
  PaginationState,
  SortingState,
} from '@molecule/app-data-table'

import type { TanStackTableConfig } from './types.js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Converts a molecule ColumnDef to a TanStack Table column definition.
 *
 * @param col - The molecule column definition.
 * @returns A TanStack Table column definition.
 */
function toTanStackColumn<T>(col: ColumnDef<T>): TanStackColumnDef<T, unknown> {
  const accessor =
    typeof col.accessor === 'function'
      ? col.accessor
      : (row: T) => (row as Record<string, unknown>)[col.accessor as string]

  return {
    id: col.id,
    header: () => col.header,
    accessorFn: accessor,
    enableSorting: col.sortable ?? false,
    enableColumnFilter: col.filterable ?? false,
    size: typeof col.width === 'number' ? col.width : undefined,
    meta: {
      align: col.align,
      pinned: col.pinned,
      visible: col.visible,
      cell: col.cell,
    },
  }
}

/**
 * Converts molecule SortingState[] to TanStack SortingState.
 *
 * @param sorting - The molecule sorting state.
 * @returns TanStack sorting state array.
 */
function toTanStackSorting(sorting: SortingState[]): TanStackSortingState {
  return sorting.map((s: SortingState) => ({ id: s.columnId, desc: s.direction === 'desc' }))
}

/**
 * Converts TanStack SortingState to molecule SortingState[].
 *
 * @param sorting - The TanStack sorting state.
 * @returns Molecule sorting state array.
 */
function fromTanStackSorting(sorting: TanStackSortingState): SortingState[] {
  return sorting.map((s: TanStackSortingState[number]) => ({
    columnId: s.id,
    direction: s.desc ? 'desc' : 'asc',
  }))
}

/**
 * Converts molecule FilterState[] to TanStack ColumnFiltersState.
 *
 * @param filters - The molecule filter state.
 * @returns TanStack column filters state.
 */
function toTanStackFilters(filters: FilterState[]): ColumnFiltersState {
  return filters.map((f: FilterState) => ({ id: f.columnId, value: f.value }))
}

/**
 * Converts TanStack ColumnFiltersState to molecule FilterState[].
 *
 * @param filters - The TanStack column filters state.
 * @returns Molecule filter state array.
 */
function fromTanStackFilters(filters: ColumnFiltersState): FilterState[] {
  return filters.map((f: ColumnFiltersState[number]) => ({ columnId: f.id, value: f.value }))
}

// ---------------------------------------------------------------------------
// TanStack Table wrapper
// ---------------------------------------------------------------------------

/**
 * Creates a DataTableInstance backed by TanStack Table.
 *
 * @template T - The row data type.
 * @param options - The molecule table options.
 * @param config - Optional TanStack-specific configuration.
 * @returns A DataTableInstance exposing query and mutation methods.
 */
function createTableInstance<T>(
  options: DataTableOptions<T>,
  config: TanStackTableConfig = {},
): DataTableInstance<T> {
  // Mutable state for TanStack's functional-reactive model
  let data = [...options.data]
  let columns = options.columns.map(toTanStackColumn)
  let sorting: TanStackSortingState = toTanStackSorting(options.sorting?.initial ?? [])
  let columnFilters: ColumnFiltersState = toTanStackFilters(options.filtering?.initial ?? [])
  let pagination: TanStackPaginationState = {
    pageIndex: options.pagination?.page ?? 0,
    pageSize: options.pagination?.pageSize ?? (data.length || 10),
  }
  let rowSelection: RowSelectionState = {}

  // Initialize selection from options
  if (options.selection?.initial) {
    for (const idx of options.selection.initial) {
      rowSelection[idx] = true
    }
  }

  const enableMultiSort = options.sorting?.multiSort ?? false
  const enableMultiRowSelection = options.selection?.multi ?? false
  const hasPagination = options.pagination !== undefined

  // Forward-declared notification helper — assigned after instance is built
  let notifyStateChange: () => void = () => {
    /* noop until instance is ready */
  }

  // Build TanStack table options
  const tableOptions: TableOptionsResolved<T> = {
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination,
      rowSelection,
    },
    onSortingChange: (updater) => {
      sorting = typeof updater === 'function' ? updater(sorting) : updater
      rerender()
      notifyStateChange()
    },
    onColumnFiltersChange: (updater) => {
      columnFilters = typeof updater === 'function' ? updater(columnFilters) : updater
      rerender()
      notifyStateChange()
    },
    onPaginationChange: (updater) => {
      pagination = typeof updater === 'function' ? updater(pagination) : updater
      rerender()
      notifyStateChange()
    },
    onRowSelectionChange: (updater) => {
      rowSelection = typeof updater === 'function' ? updater(rowSelection) : updater
      rerender()
      notifyStateChange()
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(hasPagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    enableMultiSort,
    enableMultiRowSelection,
    enableRowSelection: options.selection !== undefined,
    manualPagination: !hasPagination,
    debugAll: config.debug ?? false,
    renderFallbackValue: null,
    onStateChange: () => {
      /* handled individually above */
    },
  }

  const table = createTanStackTable(tableOptions)

  const rerender = (): void => {
    table.setOptions((prev) => ({
      ...prev,
      data,
      columns,
      state: {
        sorting,
        columnFilters,
        pagination,
        rowSelection,
      },
    }))
  }

  // ---------------------------------------------------------------------------
  // Instance
  // ---------------------------------------------------------------------------

  const instance: DataTableInstance<T> = {
    // -- Data access --
    getRows(): T[] {
      const rowModel = hasPagination ? table.getPaginationRowModel() : table.getRowModel()
      return rowModel.rows.map((r) => r.original)
    },

    getFilteredRows(): T[] {
      return table.getFilteredRowModel().rows.map((r) => r.original)
    },

    getTotalRowCount(): number {
      return data.length
    },

    // -- Pagination --
    getPagination(): PaginationState {
      const state = table.getState().pagination
      return {
        page: state.pageIndex,
        pageSize: state.pageSize,
        pageCount: table.getPageCount(),
        totalRows: table.getFilteredRowModel().rows.length,
      }
    },

    setPage(page: number): void {
      table.setPageIndex(page)
    },

    setPageSize(size: number): void {
      table.setPageSize(size)
    },

    // -- Sorting --
    getSorting(): SortingState[] {
      return fromTanStackSorting(table.getState().sorting)
    },

    setSort(columnId: string, direction: 'asc' | 'desc'): void {
      sorting = [{ id: columnId, desc: direction === 'desc' }]
      rerender()
      notifyStateChange()
    },

    clearSort(): void {
      sorting = []
      rerender()
      notifyStateChange()
    },

    // -- Filtering --
    getFilters(): FilterState[] {
      return fromTanStackFilters(table.getState().columnFilters)
    },

    setFilter(columnId: string, value: unknown): void {
      const existing = columnFilters.filter((f: ColumnFiltersState[number]) => f.id !== columnId)
      columnFilters = [...existing, { id: columnId, value }]
      rerender()
      notifyStateChange()
    },

    removeFilter(columnId: string): void {
      columnFilters = columnFilters.filter((f: ColumnFiltersState[number]) => f.id !== columnId)
      rerender()
      notifyStateChange()
    },

    clearFilters(): void {
      columnFilters = []
      rerender()
      notifyStateChange()
    },

    // -- Selection --
    getSelectedRows(): T[] {
      return table.getSelectedRowModel().rows.map((r) => r.original)
    },

    getSelectedIndices(): number[] {
      return Object.keys(rowSelection)
        .filter((k) => rowSelection[k])
        .map(Number)
    },

    selectRow(index: number): void {
      if (enableMultiRowSelection) {
        rowSelection = { ...rowSelection, [index]: true }
      } else {
        rowSelection = { [index]: true }
      }
      rerender()
      notifyStateChange()
    },

    deselectRow(index: number): void {
      const next = { ...rowSelection }
      delete next[index]
      rowSelection = next
      rerender()
      notifyStateChange()
    },

    toggleRow(index: number): void {
      if (rowSelection[index]) {
        instance.deselectRow(index)
      } else {
        instance.selectRow(index)
      }
    },

    selectAll(): void {
      const allRows = table.getFilteredRowModel().rows
      const next: RowSelectionState = {}
      for (const row of allRows) {
        next[row.index] = true
      }
      rowSelection = next
      rerender()
      notifyStateChange()
    },

    clearSelection(): void {
      rowSelection = {}
      rerender()
      notifyStateChange()
    },

    // -- Data mutation --
    setData(newData: T[]): void {
      data = [...newData]
      pagination = { ...pagination, pageIndex: 0 }
      rowSelection = {}
      rerender()
      notifyStateChange()
    },

    setColumns(newColumns: ColumnDef<T>[]): void {
      columns = newColumns.map(toTanStackColumn)
      rerender()
      notifyStateChange()
    },

    // -- Lifecycle --
    destroy(): void {
      // Reset internal state — TanStack table-core has no explicit destroy
      data = []
      columns = []
      sorting = []
      columnFilters = []
      rowSelection = {}
    },
  }

  // Wire up notification now that instance exists
  notifyStateChange = (): void => {
    if (options.onStateChange) {
      options.onStateChange(instance)
    }
  }

  return instance
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Creates a TanStack Table-backed data table provider.
 *
 * @param config - Optional TanStack-specific configuration.
 * @returns A `DataTableProvider` backed by TanStack Table.
 *
 * @example
 * ```typescript
 * import { createTanStackProvider } from '@molecule/app-data-table-tanstack'
 * import { setProvider } from '@molecule/app-data-table'
 *
 * setProvider(createTanStackProvider())
 * ```
 */
export function createTanStackProvider(config: TanStackTableConfig = {}): DataTableProvider {
  return {
    createTable<T>(options: DataTableOptions<T>): DataTableInstance<T> {
      return createTableInstance(options, config)
    },
  }
}

/** Default TanStack Table provider instance. */
export const provider: DataTableProvider = createTanStackProvider()
