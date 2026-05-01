/**
 * Cell-reference parsing and conversion utilities.
 *
 * @module
 */

import type { CellCoord, CellRange } from './types.js'

/**
 * Convert a column letter (`A`, `Z`, `AA`, `XFD`) to a 0-indexed column.
 *
 * @param letters - Column letters (case-insensitive).
 * @returns 0-indexed column number.
 */
export function columnLettersToIndex(letters: string): number {
  let n = 0
  const upper = letters.toUpperCase()
  for (let i = 0; i < upper.length; i++) {
    const code = upper.charCodeAt(i) - 64 // 'A' = 65
    if (code < 1 || code > 26) {
      throw new Error(`Invalid column letter: ${letters}`)
    }
    n = n * 26 + code
  }
  return n - 1
}

/**
 * Convert a 0-indexed column to letters (`0`→`A`, `25`→`Z`, `26`→`AA`).
 *
 * @param index - 0-indexed column.
 * @returns Column letters (uppercase).
 */
export function columnIndexToLetters(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid column index: ${index}`)
  }
  let n = index + 1
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const REF_RE = /^\$?([A-Za-z]+)\$?(\d+)$/

/**
 * Parse a single cell reference (e.g. `A1`, `$A$1`, `BC42`).
 *
 * @param ref - Reference text.
 * @returns Parsed cell coordinate, or `null` if invalid.
 */
export function parseCellReference(ref: string): CellCoord | null {
  const m = REF_RE.exec(ref)
  if (!m) return null
  const col = columnLettersToIndex(m[1]!)
  const row = Number.parseInt(m[2]!, 10) - 1
  if (row < 0) return null
  return { col, row }
}

const RANGE_RE = /^(\$?[A-Za-z]+\$?\d+):(\$?[A-Za-z]+\$?\d+)$/

/**
 * Parse a cell range (e.g. `A1:B5`). Normalizes so `start` is top-left
 * and `end` is bottom-right regardless of input ordering.
 *
 * @param ref - Range text.
 * @returns Parsed range, or `null` if invalid.
 */
export function parseCellRange(ref: string): CellRange | null {
  const m = RANGE_RE.exec(ref)
  if (!m) return null
  const a = parseCellReference(m[1]!)
  const b = parseCellReference(m[2]!)
  if (!a || !b) return null
  const start: CellCoord = {
    col: Math.min(a.col, b.col),
    row: Math.min(a.row, b.row),
  }
  const end: CellCoord = {
    col: Math.max(a.col, b.col),
    row: Math.max(a.row, b.row),
  }
  return { start, end }
}

/**
 * Format a cell coordinate as A1-style text (`{col:0,row:0}` → `A1`).
 *
 * @param coord - Cell coordinate.
 * @returns A1-style reference text.
 */
export function formatCellReference(coord: CellCoord): string {
  return `${columnIndexToLetters(coord.col)}${coord.row + 1}`
}

/**
 * Iterate every coordinate in a range. Yields top-to-bottom, left-to-right.
 *
 * @param range - Cell range.
 * @yields Each cell coordinate inside the range, inclusive of both corners.
 */
export function* iterateRange(range: CellRange): Generator<CellCoord> {
  for (let r = range.start.row; r <= range.end.row; r++) {
    for (let c = range.start.col; c <= range.end.col; c++) {
      yield { col: c, row: r }
    }
  }
}

/**
 * Encode a coordinate to a cache-friendly string key (`"col,row"`).
 *
 * @param coord - Cell coordinate.
 * @returns Stable string key.
 */
export function coordKey(coord: CellCoord): string {
  return `${coord.col},${coord.row}`
}
