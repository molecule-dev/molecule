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
 * import { createTable } from '@molecule/app-data-table'
 *
 * const table = createTable({
 *   data: users,
 *   columns: [
 *     { id: 'name', header: 'Name', accessor: 'name', sortable: true },
 *     { id: 'email', header: 'Email', accessor: 'email', filterable: true },
 *   ],
 *   pagination: { page: 0, pageSize: 20 },
 * })
 * ```
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
