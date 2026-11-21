/**
 * High-performance virtualized spreadsheet cell grid for Svelte.
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
 * ```svelte
 * <script lang="ts">
 *   import { SpreadsheetGrid } from '@molecule/app-spreadsheet-grid-svelte'
 *   import type { CellMap, SpreadsheetSelection } from '@molecule/app-spreadsheet-grid-svelte'
 *
 *   let cells = $state<CellMap>(new Map())
 *   let selection = $state<SpreadsheetSelection>({ r1: 0, c1: 0, r2: 0, c2: 0 })
 * </script>
 *
 * <SpreadsheetGrid
 *   rows={1000}
 *   columns={26}
 *   {cells}
 *   frozenRows={1}
 *   frozenCols={1}
 *   onCellChange={(ref, value) => {
 *     const next = new Map(cells)
 *     if (value === null) next.delete(ref)
 *     else next.set(ref, value)
 *     cells = next
 *   }}
 *   {selection}
 *   onSelectionChange={(next) => {
 *     selection = next
 *   }}
 * />
 * ```
 *
 * @remarks
 * - Must render with a ClassMap bond wired (`getClassMap()` throws
 *   otherwise), and inside the app's i18n provider (or with the bonded one).
 * - The viewport is FIXED-PIXEL: `viewportWidth`/`viewportHeight`
 *   (defaults 720×360) — the grid does not auto-size to its container.
 *   Measure the container and pass px if you need it to fill.
 * - Copy (Ctrl/Cmd+C) writes TSV through `copyTextWithFallback()` from
 *   `@molecule/app-clipboard`, which uses the bonded clipboard provider with
 *   a selection-and-copy fallback and never throws. Paste is handled through
 *   the native paste event, so the grid container must have focus (click a
 *   cell first). Keyboard support is Enter/F2 (edit) + copy/paste only; there
 *   is NO arrow-key cell navigation.
 * - Committed edits and pasted cells auto-coerce number-like strings to
 *   numbers (`'42'` → `42`); empty string clears the cell (`null`).
 * - Gridlines/selection/header styling uses Material-3 design-token
 *   utilities (`bg-surface`, `border-outline-variant`, …). Apps whose
 *   Tailwind theme does not define those tokens (the minimal scaffold
 *   theme does not) get a functional but unstyled grid.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
export * from './utilities.js'
