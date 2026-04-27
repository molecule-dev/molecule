/**
 * React table primitives for `<Table>` from `@molecule/app-ui-react`.
 *
 * Exports:
 * - `<DataTableCard>` — full polished-pattern data table (card wrapper +
 *   title + uppercase-th headers + divide-y body + skeleton + empty
 *   state). Drop-in for the most common dashboard CRUD use case.
 * - `<TableToolbar>` — top chrome with left/right slots + optional filter row.
 * - `<TableEmpty>` — single full-width "no rows" cell.
 * - `<TableFooter>` — bottom bar (left summary + right pagination).
 * - `<RowWithActions>` — `<tr>` wrapper with trailing actions cell and click handler.
 *
 * Use `DataTableCard` for new screens; use the row-level primitives to
 * compose richer custom tables (group-by, expandable rows, etc.).
 *
 * @module
 */

export * from './DataTableCard.js'
export * from './RowWithActions.js'
export * from './TableEmpty.js'
export * from './TableFooter.js'
export * from './TableToolbar.js'
