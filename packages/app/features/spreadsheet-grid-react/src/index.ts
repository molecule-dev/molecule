/**
 * High-performance virtualized spreadsheet cell grid for React.
 *
 * Exports:
 * - `<SpreadsheetGrid>` — the grid component (virtualized cells, frozen
 *   rows/columns, range selection, copy/paste as TSV, in-cell editing).
 * - Types: `SpreadsheetGridProps`, `SpreadsheetSelection`, `CellMap`,
 *   `CellRef`, `CellValue`.
 * - Helpers: `cellRef()`, `columnLetter()`, `normalizeSelection()`,
 *   `isInSelection()`, `formatCellValue()`, `parseClipboardTsv()`,
 *   `serializeSelectionTsv()`, `computeVisibleRange()`.
 *
 * Pairs with `@molecule/api-formula-engine` for formula evaluation —
 * pass evaluated `cells` plus an optional `renderCell` to display
 * formula results.
 *
 * @example
 * ```tsx
 * import { SpreadsheetGrid, type CellMap } from '@molecule/app-spreadsheet-grid-react'
 *
 * function Sheet() {
 *   const [cells, setCells] = useState<CellMap>(new Map())
 *   const [selection, setSelection] = useState({ r1: 0, c1: 0, r2: 0, c2: 0 })
 *   return (
 *     <SpreadsheetGrid
 *       rows={1000}
 *       columns={26}
 *       cells={cells}
 *       onCellChange={(ref, value) => {
 *         setCells((prev) => {
 *           const next = new Map(prev)
 *           if (value === null) next.delete(ref)
 *           else next.set(ref, value)
 *           return next
 *         })
 *       }}
 *       selection={selection}
 *       onSelectionChange={setSelection}
 *       frozenRows={1}
 *       frozenCols={1}
 *     />
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './SpreadsheetGrid.js'
export * from './types.js'
export * from './utilities.js'
