/**
 * TanStack Table provider for the molecule data table interface.
 *
 * Implements `DataTableProvider` from `@molecule/app-data-table` using
 * `@tanstack/table-core` for sorting, filtering, pagination, and row selection.
 *
 * @example
 * ```typescript
 * import { createTable, setProvider } from '@molecule/app-data-table'
 * import { createTanStackProvider } from '@molecule/app-data-table-tanstack'
 *
 * // Startup: bond once.
 * setProvider(createTanStackProvider())
 *
 * interface Order {
 *   id: string
 *   customer: string
 *   total: number
 * }
 * const orders: Order[] = [
 *   { id: 'o1', customer: 'Ada', total: 120 },
 *   { id: 'o2', customer: 'Grace', total: 80 },
 *   { id: 'o3', customer: 'Alan', total: 200 },
 * ]
 *
 * // Anywhere: create the table through the core, then render `getRows()` yourself.
 * const table = createTable<Order>({
 *   data: orders,
 *   columns: [ // headers are user-visible: translate them with your app's own t() keys
 *     { id: 'customer', header: 'Customer', accessor: 'customer', filterable: true },
 *     { id: 'total', header: 'Total', accessor: 'total', sortable: true },
 *   ],
 *   pagination: { page: 0, pageSize: 2 },
 *   onStateChange: (instance) => console.log(instance.getPagination()), // re-render here
 * })
 *
 * table.setSort('total', 'desc')
 * console.log(table.getRows().map((o) => o.customer)) // ['Alan', 'Ada'] — page 0 of 2
 * table.setFilter('customer', 'al') // case-insensitive "contains"
 * console.log(table.getRows().map((o) => o.customer)) // ['Alan']
 * table.destroy() // on unmount
 * ```
 *
 * @remarks
 * The factory is `createTanStackProvider(config)` — there is NO `createProvider` export.
 * Wire it with `setProvider(...)` from `@molecule/app-data-table` before the first core
 * `createTable(...)`. A column needs `sortable: true` or `setSort()` on it is silently
 * ignored (`setFilter()` applies regardless). String filters are case-insensitive
 * "contains" matches.
 * HEADLESS — the instance computes sorted/filtered/paginated state; your
 * app renders the table (via `getClassMap()`/`cm.*`) from `getRows()` and
 * re-reads after each mutation or in `onStateChange`. Integration notes:
 * `setData()` resets to page 0 and CLEARS row selection; selection is
 * row-INDEX based and `selectAll()` targets the filtered set; omit
 * `pagination` and `getRows()` returns every (sorted, filtered) row;
 * `setSort()` replaces the whole sort (single column). Column
 * `align`/`pinned`/`visible`/`cell` are passed through for your renderer —
 * the instance does not apply them.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
