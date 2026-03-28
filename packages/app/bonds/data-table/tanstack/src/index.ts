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
 * @module
 */

export * from './provider.js'
export * from './types.js'
