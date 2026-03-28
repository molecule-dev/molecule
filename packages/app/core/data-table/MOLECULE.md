# @molecule/app-data-table

Data table core interface for molecule.dev.

Provides a framework-agnostic contract for advanced data grids with
sorting, filtering, pagination, row selection, and column pinning.
Bond a provider (e.g. `@molecule/app-data-table-tanstack`) at startup,
then use {@link createTable} anywhere.

## Type
`core`

## Installation
```bash
npm install @molecule/app-data-table
```

## Usage

```typescript
import { createTable } from '@molecule/app-data-table'

const table = createTable({
  data: users,
  columns: [
    { id: 'name', header: 'Name', accessor: 'name', sortable: true },
    { id: 'email', header: 'Email', accessor: 'email', filterable: true },
  ],
  pagination: { page: 0, pageSize: 20 },
})
```

## API

### Interfaces

#### `ColumnDef`

Defines a single column in the data table.

```typescript
interface ColumnDef<T> {
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
```

#### `DataTableInstance`

A live data table instance exposing query and mutation methods.

```typescript
interface DataTableInstance<T> {
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
```

#### `DataTableOptions`

Configuration for creating a data table instance.

```typescript
interface DataTableOptions<T> {
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
```

#### `DataTableProvider`

Contract that bond packages must implement to provide data table
functionality.

```typescript
interface DataTableProvider {
  /** Creates a new data table instance from the given options. */
  createTable<T>(options: DataTableOptions<T>): DataTableInstance<T>
}
```

#### `FilteringOptions`

Filtering configuration.

```typescript
interface FilteringOptions {
  /** Initial filter values. */
  initial?: FilterState[]
  /** Debounce delay in milliseconds for filter input. */
  debounceMs?: number
}
```

#### `FilterState`

A single active column filter.

```typescript
interface FilterState {
  /** Column ID being filtered. */
  columnId: string
  /** Filter value — interpretation depends on the column type. */
  value: unknown
}
```

#### `PaginationOptions`

Pagination configuration.

```typescript
interface PaginationOptions {
  /** Current page index (zero-based). */
  page: number
  /** Number of rows per page. */
  pageSize: number
  /** Available page size options for the user to choose from. */
  pageSizeOptions?: number[]
}
```

#### `PaginationState`

Current pagination state returned by the table instance.

```typescript
interface PaginationState {
  /** Current page index (zero-based). */
  page: number
  /** Number of rows per page. */
  pageSize: number
  /** Total number of pages. */
  pageCount: number
  /** Total number of rows across all pages. */
  totalRows: number
}
```

#### `RowClickEvent`

Callback payloads for table events.

```typescript
interface RowClickEvent<T> {
  /** The clicked row data. */
  row: T
  /** The row index. */
  index: number
}
```

#### `SelectionOptions`

Row selection configuration.

```typescript
interface SelectionOptions {
  /** Allow selecting multiple rows. Defaults to `false` (single select). */
  multi?: boolean
  /** Initially selected row indices. */
  initial?: number[]
}
```

#### `SortingOptions`

Sorting configuration.

```typescript
interface SortingOptions {
  /** Initial sort criteria. */
  initial?: SortingState[]
  /** Allow sorting by multiple columns simultaneously. Defaults to `false`. */
  multiSort?: boolean
}
```

#### `SortingState`

A single active sort criterion.

```typescript
interface SortingState {
  /** Column ID being sorted. */
  columnId: string
  /** Sort direction. */
  direction: SortDirection
}
```

### Types

#### `ColumnAlign`

Alignment options for column content.

```typescript
type ColumnAlign = 'left' | 'center' | 'right'
```

#### `ColumnPin`

Pin direction for sticky columns.

```typescript
type ColumnPin = 'left' | 'right'
```

#### `SortDirection`

Sort direction.

```typescript
type SortDirection = 'asc' | 'desc'
```

### Functions

#### `createTable(options)`

Creates a new data table instance using the bonded provider.

```typescript
function createTable(options: DataTableOptions<T>): DataTableInstance<T>
```

- `options` — Table configuration including data, columns, pagination, sorting, filtering, and selection.

**Returns:** A data table instance for querying and mutating table state.

#### `getProvider()`

Retrieves the bonded data table provider, throwing if none is configured.

```typescript
function getProvider(): DataTableProvider
```

**Returns:** The bonded data table provider.

#### `hasProvider()`

Checks whether a data table provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a data table provider is bonded.

#### `setProvider(provider)`

Registers a data table provider as the active singleton. Called by bond
packages (e.g. `@molecule/app-data-table-tanstack`) during app startup.

```typescript
function setProvider(provider: DataTableProvider): void
```

- `provider` — The data table provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
