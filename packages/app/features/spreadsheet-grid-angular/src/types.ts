/**
 * Types of `@molecule/app-spreadsheet-grid-angular` — the Angular counterpart
 * of `@molecule/app-spreadsheet-grid-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * Cell reference in A1 notation (e.g. `'A1'`, `'AB17'`). Column letters are
 * uppercase; row numbers are 1-indexed.
 */
export type CellRef = string

/**
 * Primitive value stored in a cell. Formula strings start with `'='` —
 * evaluation is the host application's responsibility (typically wired
 * through `@molecule/api-formula-engine`).
 */
export type CellValue = string | number | boolean | null

/**
 * Sparse map from `CellRef` to value. Cells not present in the map render
 * as empty. Using a `Map` keeps update cost O(1) regardless of grid size.
 */
export type CellMap = Map<CellRef, CellValue>

/**
 * Inclusive rectangular selection — `r1`/`c1` is the anchor (where the
 * drag started) and `r2`/`c2` is the focus (where it ended). Both are
 * 0-indexed. A single-cell selection has `r1 === r2 && c1 === c2`.
 */
export interface SpreadsheetSelection {
  r1: number
  c1: number
  r2: number
  c2: number
}

/**
 * Props accepted by {@link SpreadsheetGrid} — the same props
 * `@molecule/app-spreadsheet-grid-react` accepts. React's `renderCell` render
 * prop is an `ng-template` receiving the value as `$implicit`/`a0` and the A1
 * reference as `a1`.
 */
export interface SpreadsheetGridProps {
  /** Total number of rows in the grid. */
  rows: number
  /** Total number of columns in the grid. */
  columns: number
  /** Sparse cell-data map. Cells not present render as empty. */
  cells: CellMap
  /** Called when the user commits an edit (Enter, Tab, or focus loss). */
  onCellChange: (ref: CellRef, value: CellValue) => void
  /** Current selection. */
  selection: SpreadsheetSelection
  /** Called when the user changes the selection (click, drag, Shift+click). */
  onSelectionChange: (selection: SpreadsheetSelection) => void
  /** Number of rows frozen at the top (default `0`). */
  frozenRows?: number
  /** Number of columns frozen on the left (default `0`). */
  frozenCols?: number
  /** Per-cell width in pixels (default `96`). */
  cellWidth?: number
  /** Per-cell height in pixels (default `28`). */
  cellHeight?: number
  /** Width of the row-number gutter on the left (default `48`). */
  gutterWidth?: number
  /** Height of the column-letter header (default `28`). */
  headerHeight?: number
  /** Visible viewport width in pixels (default `720`). */
  viewportWidth?: number
  /** Visible viewport height in pixels (default `360`). */
  viewportHeight?: number
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /**
   * Optional cell renderer (`ng-template`): `$implicit`/`a0` is the raw value,
   * `a1` the A1 reference. Defaults to plain text.
   */
  renderCell?: TemplateRef<unknown> | null
}
