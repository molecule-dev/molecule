/**
 * Shared types for `<SpreadsheetGrid>` and helpers.
 */

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
