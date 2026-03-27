/**
 * Data table provider interface and related types.
 *
 * Defines framework-agnostic contracts for advanced data grids with
 * sorting, filtering, pagination, row selection, and column pinning.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Column Definition
// ---------------------------------------------------------------------------

/** Alignment options for column content. */
export type ColumnAlign = 'left' | 'center' | 'right'

/** Pin direction for sticky columns. */
export type ColumnPin = 'left' | 'right'

/** Sort direction. */
export type SortDirection = 'asc' | 'desc'

/**
 * Defines a single column in the data table.
 *
 * @template T - The row data type.
 */
export interface ColumnDef<T> {
  /** Unique column identifier. */
  id: string
  /** Display header text (pass through i18n before setting). */
  header: string
  /** Property key or accessor function to extract cell value from a row. */
  accessor: keyof T | ((row: T) => unknown)
  /** Optional custom cell renderer — returns a framework-agnostic value. */
  cell?: (value: unknown, row: T) => unknown
  /** Whether the column supports sorting. Defaults to `false`. */
  sortable?: boolean
  /** Whether the column supports filtering. Defaults to `false`. */
  filterable?: boolean
  /** Column width as a number (pixels) or CSS string. */
  width?: number | string
  /** Horizontal alignment of cell content. */
  align?: ColumnAlign
  /** Pin the column to the left or right edge. */
  pinned?: ColumnPin
  /** Whether the column is visible. Defaults to `true`. */
  visible?: boolean
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Pagination configuration.
 */
export interface PaginationOptions {
  /** Current page index (zero-based). */
  page: number
  /** Number of rows per page. */
  pageSize: number
  /** Available page size options for the user to choose from. */
  pageSizeOptions?: number[]
}

/**
 * Current pagination state returned by the table instance.
 */
export interface PaginationState {
  /** Current page index (zero-based). */
  page: number
  /** Number of rows per page. */
  pageSize: number
  /** Total number of pages. */
  pageCount: number
  /** Total number of rows across all pages. */
  totalRows: number
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/**
 * A single active sort criterion.
 */
export interface SortingState {
  /** Column ID being sorted. */
  columnId: string
  /** Sort direction. */
  direction: SortDirection
}

/**
 * Sorting configuration.
 */
export interface SortingOptions {
  /** Initial sort criteria. */
  initial?: SortingState[]
  /** Allow sorting by multiple columns simultaneously. Defaults to `false`. */
  multiSort?: boolean
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * A single active column filter.
 */
export interface FilterState {
  /** Column ID being filtered. */
  columnId: string
  /** Filter value — interpretation depends on the column type. */
  value: unknown
}

/**
 * Filtering configuration.
 */
export interface FilteringOptions {
  /** Initial filter values. */
  initial?: FilterState[]
  /** Debounce delay in milliseconds for filter input. */
  debounceMs?: number
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/**
 * Row selection configuration.
 */
export interface SelectionOptions {
  /** Allow selecting multiple rows. Defaults to `false` (single select). */
  multi?: boolean
  /** Initially selected row indices. */
  initial?: number[]
}

/**
 * Callback payloads for table events.
 */
export interface RowClickEvent<T> {
  /** The clicked row data. */
  row: T
  /** The row index. */
  index: number
}

// ---------------------------------------------------------------------------
// Table Instance
// ---------------------------------------------------------------------------

/**
 * A live data table instance exposing query and mutation methods.
 *
 * @template T - The row data type.
 */
export interface DataTableInstance<T> {
  // -- Data access --------------------------------------------------------

  /** Returns the currently visible (paginated / filtered / sorted) rows. */
  getRows(): T[]

  /** Returns all rows after filtering but before pagination. */
  getFilteredRows(): T[]

  /** Returns the total number of rows before any filtering. */
  getTotalRowCount(): number

  // -- Pagination ---------------------------------------------------------

  /** Returns the current pagination state. */
  getPagination(): PaginationState

  /** Navigates to the given page (zero-based). */
  setPage(page: number): void

  /** Changes the page size. Resets to page 0. */
  setPageSize(pageSize: number): void

  // -- Sorting ------------------------------------------------------------

  /** Returns the current sort criteria. */
  getSorting(): SortingState[]

  /** Sets sorting for a single column, replacing existing sort state. */
  setSort(columnId: string, direction: SortDirection): void

  /** Clears all active sorting. */
  clearSort(): void

  // -- Filtering ----------------------------------------------------------

  /** Returns all active filters. */
  getFilters(): FilterState[]

  /** Sets a filter for the given column. */
  setFilter(columnId: string, value: unknown): void

  /** Removes the filter for the given column. */
  removeFilter(columnId: string): void

  /** Clears all active filters. */
  clearFilters(): void

  // -- Selection ----------------------------------------------------------

  /** Returns the currently selected rows. */
  getSelectedRows(): T[]

  /** Returns the indices of the currently selected rows. */
  getSelectedIndices(): number[]

  /** Selects the row at the given index. */
  selectRow(index: number): void

  /** Deselects the row at the given index. */
  deselectRow(index: number): void

  /** Toggles the selection state of the row at the given index. */
  toggleRow(index: number): void

  /** Selects all rows. */
  selectAll(): void

  /** Clears all selection. */
  clearSelection(): void

  // -- Data mutation ------------------------------------------------------

  /** Replaces the data set. Resets pagination to page 0. */
  setData(data: T[]): void

  /** Replaces the column definitions. */
  setColumns(columns: ColumnDef<T>[]): void

  // -- Lifecycle ----------------------------------------------------------

  /** Releases resources held by the table instance. */
  destroy(): void
}

// ---------------------------------------------------------------------------
// Table Options
// ---------------------------------------------------------------------------

/**
 * Configuration for creating a data table instance.
 *
 * @template T - The row data type.
 */
export interface DataTableOptions<T> {
  /** The data rows to display. */
  data: T[]
  /** Column definitions. */
  columns: ColumnDef<T>[]
  /** Pagination configuration. */
  pagination?: PaginationOptions
  /** Sorting configuration. */
  sorting?: SortingOptions
  /** Filtering configuration. */
  filtering?: FilteringOptions
  /** Row selection configuration. */
  selection?: SelectionOptions
  /** Handler called when a row is clicked. */
  onRowClick?: (event: RowClickEvent<T>) => void
  /** Handler called when the state changes (sort, filter, page, selection). */
  onStateChange?: (instance: DataTableInstance<T>) => void
  /** Whether the table is in a loading state. */
  loading?: boolean
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Contract that bond packages must implement to provide data table
 * functionality.
 *
 * @template T - The row data type.
 */
export interface DataTableProvider {
  /** Creates a new data table instance from the given options. */
  createTable<T>(options: DataTableOptions<T>): DataTableInstance<T>
}
