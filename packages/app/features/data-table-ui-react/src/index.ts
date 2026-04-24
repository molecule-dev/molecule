/**
 * React row-level primitives for `<Table>` from `@molecule/app-ui-react`.
 *
 * Exports:
 * - `<TableToolbar>` — top chrome with left/right slots + optional filter row.
 * - `<TableEmpty>` — single full-width "no rows" cell.
 * - `<TableFooter>` — bottom bar (left summary + right pagination).
 * - `<RowWithActions>` — `<tr>` wrapper with trailing actions cell and click handler.
 *
 * Use these to compose standard CRUD table screens without re-implementing
 * the surrounding chrome on every page.
 *
 * @module
 */

export * from './RowWithActions.js'
export * from './TableEmpty.js'
export * from './TableFooter.js'
export * from './TableToolbar.js'
