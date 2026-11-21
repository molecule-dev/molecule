import type { CellMap, CellRef, CellValue, SpreadsheetSelection } from './types.js'

/**
 * Convert a 0-indexed column number to its A1 letter (`0` → `'A'`, `25` →
 * `'Z'`, `26` → `'AA'`, `701` → `'ZZ'`, `702` → `'AAA'`).
 *
 * @param col - 0-indexed column number.
 * @returns Uppercase A1 column letter.
 */
export function columnLetter(col: number): string {
  let n = col
  let result = ''
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  }
  return result
}

/**
 * Build an A1 reference from 0-indexed row and column numbers.
 *
 * @param row - 0-indexed row number.
 * @param col - 0-indexed column number.
 * @returns A1-style cell reference (e.g. `'B3'`).
 */
export function cellRef(row: number, col: number): CellRef {
  return `${columnLetter(col)}${row + 1}`
}

/**
 * Normalize a possibly-inverted selection so `r1 <= r2 && c1 <= c2`.
 *
 * @param sel - Raw selection (anchor and focus).
 * @returns Selection with `r1`/`c1` as top-left and `r2`/`c2` as bottom-right.
 */
export function normalizeSelection(sel: SpreadsheetSelection): SpreadsheetSelection {
  return {
    r1: Math.min(sel.r1, sel.r2),
    c1: Math.min(sel.c1, sel.c2),
    r2: Math.max(sel.r1, sel.r2),
    c2: Math.max(sel.c1, sel.c2),
  }
}

/**
 * Test whether `(row, col)` is inside the selection.
 *
 * @param sel - Selection to test against.
 * @param row - 0-indexed row number.
 * @param col - 0-indexed column number.
 * @returns `true` when the cell is in the selection.
 */
export function isInSelection(sel: SpreadsheetSelection, row: number, col: number): boolean {
  const n = normalizeSelection(sel)
  return row >= n.r1 && row <= n.r2 && col >= n.c1 && col <= n.c2
}

/**
 * Format a cell value for display. `null`/`undefined` render as the empty
 * string; booleans become `TRUE`/`FALSE` (matching common spreadsheet
 * tools); numbers and strings stringify as-is.
 *
 * @param value - The raw cell value.
 * @returns Display string.
 */
export function formatCellValue(value: CellValue | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  return String(value)
}

/**
 * Parse a TSV (tab-separated values) string into a 2D array of strings.
 * Empty trailing lines are ignored. Used to ingest clipboard paste data.
 *
 * @param text - Clipboard text (typically TSV).
 * @returns 2D array of cell strings — `rows[r][c]`.
 */
export function parseClipboardTsv(text: string): string[][] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines.map((line) => line.split('\t'))
}

/**
 * Serialize a rectangular selection to TSV (tab-separated values) so it
 * can round-trip with Excel/Google Sheets via the system clipboard.
 *
 * @param cells - Source cell map.
 * @param sel - Selection to serialize.
 * @returns TSV-formatted string with `\n` row separators.
 */
export function serializeSelectionTsv(cells: CellMap, sel: SpreadsheetSelection): string {
  const n = normalizeSelection(sel)
  const rows: string[] = []
  for (let r = n.r1; r <= n.r2; r += 1) {
    const cols: string[] = []
    for (let c = n.c1; c <= n.c2; c += 1) {
      cols.push(formatCellValue(cells.get(cellRef(r, c))))
    }
    rows.push(cols.join('\t'))
  }
  return rows.join('\n')
}

/**
 * Compute the inclusive `[start, end]` window of indices to render given
 * the scroll offset, viewport size, item size, and total count. Adds an
 * `overscan` margin on each side so newly-visible cells are pre-rendered
 * during fast scrolls.
 *
 * @param scroll - Current scroll position (px).
 * @param viewport - Viewport size (px) along the scroll axis.
 * @param itemSize - Per-item size (px) along the scroll axis.
 * @param total - Total number of items.
 * @param overscan - Extra items to render on each side (default `2`).
 * @returns `[startIndex, endIndex]` (both inclusive, clamped to `[0, total)`).
 */
export function computeVisibleRange(
  scroll: number,
  viewport: number,
  itemSize: number,
  total: number,
  overscan = 2,
): [number, number] {
  if (total <= 0 || itemSize <= 0) return [0, -1]
  const start = Math.max(0, Math.floor(scroll / itemSize) - overscan)
  const end = Math.min(total - 1, Math.ceil((scroll + viewport) / itemSize) + overscan)
  return [start, end]
}
