/**
 * Data table core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for advanced data grids with
 * sorting, filtering, pagination, row selection, and column pinning.
 * Bond a provider (e.g. `@molecule/app-data-table-tanstack`) at startup,
 * then use {@link createTable} anywhere.
 *
 * @example
 * ```typescript
 * import { createTable, setProvider } from '@molecule/app-data-table'
 * import { provider } from '@molecule/app-data-table-tanstack'
 *
 * setProvider(provider) // at startup — createTable() throws until a provider is bonded
 *
 * interface User {
 *   id: string
 *   name: string
 *   email: string
 * }
 * const users: User[] = [
 *   { id: 'u1', name: 'Grace Hopper', email: 'grace@example.com' },
 *   { id: 'u2', name: 'Ada Lovelace', email: 'ada@example.com' },
 *   { id: 'u3', name: 'Alan Turing', email: 'alan@example.com' },
 * ]
 *
 * const table = createTable<User>({
 *   data: users,
 *   columns: [
 *     { id: 'name', header: 'Name', accessor: 'name', sortable: true },
 *     { id: 'email', header: 'Email', accessor: 'email', filterable: true },
 *   ],
 *   pagination: { page: 0, pageSize: 2 },
 *   onStateChange: (t) => console.log(t.getRows().length), // re-render your <table> here
 * })
 *
 * table.setSort('name', 'asc') // header click
 * console.log(table.getRows().map((u) => u.name)) // ['Ada Lovelace', 'Alan Turing'] — page 1 only
 * table.setFilter('email', 'grace') // search box
 * console.log(table.getFilteredRows().length, table.getPagination().totalRows) // 1 1
 * ```
 *
 * @remarks
 * - **Headless — `createTable()` renders NOTHING.** Build your own `<table>` from
 *   `getRows()` (styled via `getClassMap()`, headers through `t()`), and re-render
 *   from `onStateChange` after every sort/filter/page/selection call.
 * - **Bond a provider first** (`setProvider(provider)` from
 *   `@molecule/app-data-table-tanstack`); `createTable()` throws otherwise.
 * - **`sortable` defaults to `false`, and `setSort()` on such a column is silently
 *   ignored** by the TanStack bond — set `sortable: true` on every sortable column.
 * - `getRows()` is the CURRENT PAGE only (when `pagination` is set);
 *   `getFilteredRows()` is every row matching the filters across all pages;
 *   `getTotalRowCount()` is the unfiltered data length. Pages are 0-based.
 * - All data is client-side: pass the full array (or one server page and handle
 *   paging yourself) and call `setData()` after refetching — the table never fetches.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The table renders the seeded rows with the expected columns (no empty grid
 *   against non-empty data, no `undefined` cells).
 * - [ ] Clicking a sortable header re-orders the rows (toggle asc/desc and check
 *   the first row actually changes; a sort indicator is visible).
 * - [ ] Entering a filter/search value narrows the rows to matches; clearing it
 *   restores the full set.
 * - [ ] Pagination works: next/previous show different rows, the page indicator is
 *   correct, and the page size is respected.
 * - [ ] A filter with no matches shows a readable empty state — not a blank or
 *   broken table.
 * - [ ] If row selection is enabled, selecting rows updates the selection state
 *   and any bulk action operates on exactly the selected rows.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
