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
 * @module
 */

export * from './provider.js'
export * from './types.js'
