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
 * import { useState } from 'react'
 *
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
 * @remarks
 * - Must render inside the app's i18n provider and with a ClassMap bond
 *   wired (`useTranslation()` / `getClassMap()` throw otherwise).
 * - The viewport is FIXED-PIXEL: `viewportWidth`/`viewportHeight`
 *   (defaults 720×360) — the grid does not auto-size to its container.
 *   Measure the container and pass px if you need it to fill.
 * - Copy (Ctrl/Cmd+C) writes TSV via `navigator.clipboard` — secure
 *   contexts only (HTTPS/localhost). Paste is handled through the native
 *   paste event, so the grid container must have focus (click a cell
 *   first). Keyboard support is Enter/F2 (edit) + copy/paste only; there
 *   is NO arrow-key cell navigation.
 * - Committed edits and pasted cells auto-coerce number-like strings to
 *   numbers (`'42'` → `42`); empty string clears the cell (`null`).
 * - Gridlines/selection/header styling uses Material-3 design-token
 *   utilities (`bg-surface`, `border-outline-variant`, …). Apps whose
 *   Tailwind theme does not define those tokens (the minimal scaffold
 *   theme does not) get a functional but unstyled grid — flagship-derived
 *   themes render it fully.
 *
 * @module
 */

export * from './SpreadsheetGrid.js'
export * from './types.js'
export * from './utilities.js'
