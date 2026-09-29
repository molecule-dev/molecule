/**
 * Post-processing helpers for TeleOCR's structured outputs.
 *
 * The `table` and `scientificFigure` tasks answer in OTSL (a compact table
 * token language), and the `formula` task answers in LaTeX. These are ports of
 * the model card's `convert_otsl_to_html` and equation post-processing, so the
 * results match the reference implementation.
 *
 * @module
 */

/** A new table row. */
const NL = '<nl>'
/** A cell with content. */
const FCEL = '<fcel>'
/** An empty cell. */
const ECEL = '<ecel>'
/** Merged into the cell to the left. */
const LCEL = '<lcel>'
/** Merged into the cell above. */
const UCEL = '<ucel>'
/** Merged into both the cell to the left and the cell above. */
const XCEL = '<xcel>'

/** Every OTSL token, in the order the reference splits on them. */
export const OTSL_TOKENS: readonly string[] = [NL, FCEL, ECEL, LCEL, UCEL, XCEL]

const TOKEN_SET = new Set<string>(OTSL_TOKENS)
const TOKEN_PATTERN = new RegExp(
  `(${OTSL_TOKENS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
)
const COL_SPAN_TOKENS = new Set([LCEL, XCEL])
const ROW_SPAN_TOKENS = new Set([UCEL, XCEL])

/** One cell of a parsed table, with its grid position and spans. */
interface TableCell {
  text: string
  startRow: number
  endRow: number
  startCol: number
  endCol: number
  rowSpan: number
  colSpan: number
}

/**
 * Counts consecutive span tokens rightwards from a position.
 *
 * @param rows - The token grid.
 * @param rowIdx - The row to scan.
 * @param colIdx - The first column to test.
 * @param tokens - The tokens that continue the span.
 * @returns The number of consecutive matching tokens.
 */
function countRight(rows: string[][], rowIdx: number, colIdx: number, tokens: Set<string>): number {
  const row = rows[rowIdx]
  if (!row) return 0
  let span = 0
  while (colIdx < row.length && tokens.has(row[colIdx])) {
    span++
    colIdx++
  }
  return span
}

/**
 * Counts consecutive span tokens downwards from a position.
 *
 * @param rows - The token grid.
 * @param rowIdx - The first row to test.
 * @param colIdx - The column to scan.
 * @param tokens - The tokens that continue the span.
 * @returns The number of consecutive matching tokens.
 */
function countDown(rows: string[][], rowIdx: number, colIdx: number, tokens: Set<string>): number {
  let span = 0
  while (rowIdx < rows.length && colIdx < rows[rowIdx].length && tokens.has(rows[rowIdx][colIdx])) {
    span++
    rowIdx++
  }
  return span
}

/**
 * Escapes text for HTML the way Python's `html.escape` does (quotes included).
 *
 * @param text - Raw cell text.
 * @returns HTML-safe text.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Parses OTSL parts into cells and a padded token grid.
 *
 * @param parts - Tokens and cell texts, in order.
 * @param tokens - The tokens alone, in order.
 * @returns The cells and the token grid (every row padded to the widest).
 */
function parseCells(parts: string[], tokens: string[]): { cells: TableCell[]; rows: string[][] } {
  const rows: string[][] = []
  let current: string[] = []
  for (const token of tokens) {
    if (token === NL) {
      if (current.length) rows.push(current)
      current = []
    } else current.push(token)
  }
  if (current.length) rows.push(current)
  if (!rows.length) return { cells: [], rows: [] }

  const maxCols = Math.max(...rows.map((row) => row.length))
  for (const row of rows) while (row.length < maxCols) row.push(ECEL)

  const cells: TableCell[] = []
  let rowIdx = 0
  let colIdx = 0
  parts.forEach((part, idx) => {
    if (part === FCEL || part === ECEL) {
      let text = ''
      let rightOffset = 1
      if (part !== ECEL && idx + 1 < parts.length && !TOKEN_SET.has(parts[idx + 1])) {
        text = parts[idx + 1].trim()
        rightOffset = 2
      }
      const nextRight = idx + rightOffset < parts.length ? parts[idx + rightOffset] : ''
      const below = rows[rowIdx + 1]
      const nextBottom = below && colIdx < below.length ? below[colIdx] : ''
      const colSpan =
        1 +
        (COL_SPAN_TOKENS.has(nextRight) ? countRight(rows, rowIdx, colIdx + 1, COL_SPAN_TOKENS) : 0)
      const rowSpan =
        1 +
        (ROW_SPAN_TOKENS.has(nextBottom) ? countDown(rows, rowIdx + 1, colIdx, ROW_SPAN_TOKENS) : 0)
      cells.push({
        text,
        rowSpan,
        colSpan,
        startRow: rowIdx,
        endRow: rowIdx + rowSpan,
        startCol: colIdx,
        endCol: colIdx + colSpan,
      })
    }
    if (part === FCEL || part === ECEL || part === LCEL || part === UCEL || part === XCEL) {
      colIdx++
    } else if (part === NL) {
      rowIdx++
      colIdx = 0
    }
  })
  return { cells, rows }
}

/**
 * Converts TeleOCR's OTSL table output (`<fcel>`, `<nl>`, … tokens) into an
 * HTML `<table>` with `rowspan`/`colspan` for merged cells. Cell text is
 * HTML-escaped. Output that is already a `<table>…</table>` is returned as-is.
 *
 * @param otsl - The model's raw answer to the `table` or `scientificFigure` prompt.
 * @returns An HTML table, or `''` when the input holds no cells.
 */
export function convertOtslToHtml(otsl: string): string {
  if (otsl.startsWith('<table') && otsl.endsWith('</table>')) return otsl

  const tokens = otsl.match(new RegExp(TOKEN_PATTERN.source, 'g')) ?? []
  const parts = otsl.split(TOKEN_PATTERN).filter((part) => part.trim())
  const { cells, rows } = parseCells(parts, tokens)
  if (!cells.length || !rows.length) return ''

  const width = rows[0].length
  const grid: (TableCell | null)[][] = rows.map(() => new Array<TableCell | null>(width).fill(null))
  for (const cell of cells) {
    for (let r = cell.startRow; r < Math.min(cell.endRow, rows.length); r++) {
      for (let c = cell.startCol; c < Math.min(cell.endCol, width); c++) grid[r][c] = cell
    }
  }

  const html: string[] = []
  grid.forEach((row, r) => {
    html.push('<tr>')
    row.forEach((cell, c) => {
      if (!cell || cell.startRow !== r || cell.startCol !== c) return
      let attrs = ''
      if (cell.rowSpan > 1) attrs += ` rowspan="${cell.rowSpan}"`
      if (cell.colSpan > 1) attrs += ` colspan="${cell.colSpan}"`
      html.push(`<td${attrs}>${escapeHtml(cell.text.trim())}</td>`)
    })
    html.push('</tr>')
  })
  return '<table>' + html.join('') + '</table>'
}

/**
 * Normalizes TeleOCR's `formula` answer the way the reference does: strips a
 * surrounding `\[ … \]` and wraps the LaTeX in `$$ … $$` unless it is already
 * `$`-delimited.
 *
 * @param latex - The model's raw answer to the `formula` prompt.
 * @returns Display-math LaTeX.
 */
export function formatFormula(latex: string): string {
  let content = latex.trim()
  if (content.startsWith('\\[')) content = content.slice(2)
  if (content.endsWith('\\]')) content = content.slice(0, -2)
  content = content.trim()
  if (!(content.startsWith('$') && content.endsWith('$'))) content = `$$${content}$$`
  return content
}
