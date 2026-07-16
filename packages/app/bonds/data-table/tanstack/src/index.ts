/**
 * TanStack Table provider for the molecule data table interface.
 *
 * Implements `DataTableProvider` from `@molecule/app-data-table` using
 * `@tanstack/table-core` for sorting, filtering, pagination, and row selection.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-data-table-tanstack'
 * import { setProvider } from '@molecule/app-data-table'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
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
