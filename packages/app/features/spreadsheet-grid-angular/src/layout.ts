/**
 * Geometry, ClassMap classes and inline-style strings for `<SpreadsheetGrid>`.
 *
 * The plan is framework-neutral: every framework's port computes the same one
 * from the same props and state, so the rendered DOM (positions, classes,
 * indices, text) cannot drift between frameworks.
 *
 * @module
 */

import type { UIClassMap } from '@molecule/app-ui'

import type { CellMap, CellRef, CellValue, SpreadsheetSelection } from './types.js'
import {
  cellRef,
  columnLetter,
  computeVisibleRange,
  formatCellValue,
  isInSelection,
} from './utilities.js'

/** The open in-cell editor. */
export interface GridEditing {
  /** 0-indexed row of the edited cell. */
  row: number
  /** 0-indexed column of the edited cell. */
  col: number
  /** The draft text the editor shows. */
  draft: string
}

/** Everything the plan is computed from. */
export interface GridGeometry {
  /** Total number of rows. */
  rows: number
  /** Total number of columns. */
  columns: number
  /** Sparse cell data. */
  cells: CellMap
  /** Current selection. */
  selection: SpreadsheetSelection
  /** Rows frozen at the top. */
  frozenRows: number
  /** Columns frozen on the left. */
  frozenCols: number
  /** Per-cell width in pixels. */
  cellWidth: number
  /** Per-cell height in pixels. */
  cellHeight: number
  /** Width of the row-number gutter. */
  gutterWidth: number
  /** Height of the column-letter header. */
  headerHeight: number
  /** Visible viewport width. */
  viewportWidth: number
  /** Visible viewport height. */
  viewportHeight: number
  /** Horizontal scroll offset of the scrollable region. */
  scrollLeft: number
  /** Vertical scroll offset of the scrollable region. */
  scrollTop: number
  /** The open editor, or `null`. */
  editing: GridEditing | null
}

/** One column-letter or row-number label. */
export interface GridHeaderCell {
  /** A stable key for the label. */
  key: string
  /** The 0-indexed column (headers) or row (gutter). */
  index: number
  /** The label text (`A`, `12`). */
  text: string
  /** Its inline style. */
  style: string
  /** Its ClassMap classes. */
  classes: string
}

/** One rendered cell, positioned for the region it renders in. */
export interface GridCell {
  /** 0-indexed row. */
  row: number
  /** 0-indexed column. */
  col: number
  /** A1 reference. */
  ref: CellRef
  /** The raw cell value. */
  value: CellValue | undefined
  /** The value's display string (React's `formatCellValue`). */
  text: string
  /** Its inline style for its region. */
  style: string
  /** Its ClassMap classes. */
  classes: string
  /** Whether the cell lies inside the selection. */
  selected: boolean
  /** Whether it is the selection anchor (the cell in the tab order). */
  anchor: boolean
}

/** The plan one render of the grid is built from. */
export interface GridLayout {
  /** The root `<div role="grid">`. */
  rootClasses: string
  /** Its inline style. */
  rootStyle: string
  /** The top-left corner. */
  cornerClasses: string
  /** Its inline style. */
  cornerStyle: string
  /** The column-letter header lane. */
  headerLaneClasses: string
  /** Its inline style. */
  headerLaneStyle: string
  /** The scrolling column-letter container's inline style. */
  headerScrollerStyle: string
  /** The letters of the frozen columns. */
  frozenHeaderCells: GridHeaderCell[]
  /** The letters of the scrolling columns. */
  scrollingHeaderCells: GridHeaderCell[]
  /** The row-number gutter lane. */
  gutterLaneClasses: string
  /** Its inline style. */
  gutterLaneStyle: string
  /** The scrolling row-number container's inline style. */
  gutterScrollerStyle: string
  /** The numbers of the frozen rows. */
  frozenGutterCells: GridHeaderCell[]
  /** The numbers of the scrolling rows. */
  scrollingGutterCells: GridHeaderCell[]
  /** Whether the frozen-rows region renders. */
  showFrozenRows: boolean
  /** Whether the frozen-cols region renders. */
  showFrozenCols: boolean
  /** Whether the frozen-rows × frozen-cols corner renders. */
  showFrozenCorner: boolean
  /** The frozen-rows region's inline style. */
  frozenRowsRegionStyle: string
  /** Its inner (scrolling) container's inline style. */
  frozenRowsInnerStyle: string
  /** The frozen-cols region's inline style. */
  frozenColsRegionStyle: string
  /** Its inner (scrolling) container's inline style. */
  frozenColsInnerStyle: string
  /** The frozen corner's inline style. */
  frozenCornerStyle: string
  /** Cells of the frozen-rows × scrolling-cols region. */
  frozenRowsCells: GridCell[]
  /** Cells of the frozen-cols × scrolling-rows region. */
  frozenColsCells: GridCell[]
  /** Cells of the frozen-rows × frozen-cols corner. */
  frozenCornerCells: GridCell[]
  /** Cells of the main scrollable region. */
  mainCells: GridCell[]
  /** Every rendered cell, by A1 reference (a region's cells are disjoint from the others'). */
  byRef: Map<string, GridCell>
  /** The scroll region's inline style. */
  scrollRegionStyle: string
  /** The scroll spacer's inline style. */
  scrollSpacerStyle: string
  /** The hidden total-size hint's classes. */
  totalClasses: string
  /** Its inline style. */
  totalStyle: string
  /** Its text (`720×360`). */
  totalText: string
  /** The in-cell editor input's classes. */
  editorClasses: string
  /** The cell content wrapper's classes. */
  contentClasses: string
}

/**
 * A pixel length, as React writes one.
 *
 * @param value - A length in pixels.
 * @returns The CSS length (`28px`).
 */
const px = (value: number): string => `${value}px`

/**
 * Whether a cell is the selection anchor.
 *
 * @param selection - The selection.
 * @param row - The cell's 0-indexed row.
 * @param col - The cell's 0-indexed column.
 * @returns `true` when the cell is the anchor.
 */
const isAnchor = (selection: SpreadsheetSelection, row: number, col: number): boolean =>
  selection.r1 === row && selection.c1 === col

/**
 * Builds the cell box style of one region.
 *
 * @param geometry - The grid geometry.
 * @param left - The cell's left offset in pixels.
 * @param top - The cell's top offset in pixels.
 * @returns The inline style.
 */
const cellBoxStyle = (geometry: GridGeometry, left: number, top: number): string =>
  `position: absolute; left: ${px(left)}; top: ${px(top)}; width: ${px(
    geometry.cellWidth,
  )}; height: ${px(geometry.cellHeight)}; box-sizing: border-box;`

/**
 * Describes one rendered cell.
 *
 * @param geometry - The grid geometry.
 * @param cm - The ClassMap.
 * @param row - The cell's 0-indexed row.
 * @param col - The cell's 0-indexed column.
 * @param left - Its left offset in pixels.
 * @param top - Its top offset in pixels.
 * @returns The cell.
 */
const cellAt = (
  geometry: GridGeometry,
  cm: UIClassMap,
  row: number,
  col: number,
  left: number,
  top: number,
): GridCell => {
  const ref = cellRef(row, col)
  const selected = isInSelection(geometry.selection, row, col)
  const anchor = isAnchor(geometry.selection, row, col)
  const value = geometry.cells.get(ref)
  return {
    row,
    col,
    ref,
    value,
    text: formatCellValue(value),
    style: cellBoxStyle(geometry, left, top),
    classes: cm.cn(
      cm.spreadsheetGridCellBorder,
      selected ? cm.spreadsheetGridCellSelected : cm.surface,
      anchor ? cm.spreadsheetGridCellAnchor : '',
    ),
    selected,
    anchor,
  }
}

/**
 * Computes one render's plan from the grid's geometry and state.
 *
 * @param geometry - The grid geometry.
 * @param cm - The bonded ClassMap.
 * @returns The layout plan.
 */
export function computeLayout(geometry: GridGeometry, cm: UIClassMap): GridLayout {
  const { cellHeight, cellWidth, columns, frozenCols, frozenRows, gutterWidth, headerHeight } =
    geometry
  const frozenRowsHeight = frozenRows * cellHeight
  const frozenColsWidth = frozenCols * cellWidth
  const scrollableWidth = Math.max(0, geometry.viewportWidth - gutterWidth - frozenColsWidth)
  const scrollableHeight = Math.max(0, geometry.viewportHeight - headerHeight - frozenRowsHeight)

  const [colStart, colEnd] = computeVisibleRange(
    geometry.scrollLeft,
    scrollableWidth,
    cellWidth,
    Math.max(0, columns - frozenCols),
  )
  const [rowStart, rowEnd] = computeVisibleRange(
    geometry.scrollTop,
    scrollableHeight,
    cellHeight,
    Math.max(0, geometry.rows - frozenRows),
  )

  const visibleCols: number[] = []
  for (let c = frozenCols + colStart; c <= frozenCols + colEnd; c += 1) {
    if (c >= columns) break
    visibleCols.push(c)
  }
  const visibleRows: number[] = []
  for (let r = frozenRows + rowStart; r <= frozenRows + rowEnd; r += 1) {
    if (r >= geometry.rows) break
    visibleRows.push(r)
  }
  const frozenColumns = Array.from({ length: Math.min(frozenCols, columns) }, (_v, i) => i)
  const frozenRowIndices = Array.from({ length: Math.min(frozenRows, geometry.rows) }, (_v, i) => i)

  const totalScrollWidth = Math.max(0, columns - frozenCols) * cellWidth
  const totalScrollHeight = Math.max(0, geometry.rows - frozenRows) * cellHeight
  const totalGridWidth = gutterWidth + columns * cellWidth
  const totalGridHeight = headerHeight + geometry.rows * cellHeight

  const headerCellClasses = cm.cn(
    cm.spreadsheetGridHeaderCell,
    cm.textCenter,
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
  )
  const headerCellStyle = (left: number): string =>
    `position: absolute; left: ${px(left)}; top: ${px(0)}; width: ${px(
      cellWidth,
    )}; height: ${px(headerHeight)}; line-height: ${px(headerHeight)};`
  const gutterCellStyle = (top: number, width: number, height: number): string =>
    `position: absolute; left: ${px(0)}; top: ${px(top)}; width: ${px(
      width,
    )}; height: ${px(height)}; line-height: ${px(height)};`

  const frozenRowsCells: GridCell[] = []
  const frozenColsCells: GridCell[] = []
  const frozenCornerCells: GridCell[] = []
  const mainCells: GridCell[] = []

  if (frozenRows > 0)
    for (const row of frozenRowIndices)
      for (const col of visibleCols)
        frozenRowsCells.push(
          cellAt(geometry, cm, row, col, (col - frozenCols) * cellWidth, row * cellHeight),
        )
  if (frozenCols > 0)
    for (const col of frozenColumns)
      for (const row of visibleRows)
        frozenColsCells.push(
          cellAt(geometry, cm, row, col, col * cellWidth, (row - frozenRows) * cellHeight),
        )
  if (frozenRows > 0 && frozenCols > 0)
    for (const row of frozenRowIndices)
      for (const col of frozenColumns)
        frozenCornerCells.push(cellAt(geometry, cm, row, col, col * cellWidth, row * cellHeight))
  for (const row of visibleRows)
    for (const col of visibleCols)
      mainCells.push(
        cellAt(
          geometry,
          cm,
          row,
          col,
          (col - frozenCols) * cellWidth,
          (row - frozenRows) * cellHeight,
        ),
      )

  return {
    rootClasses: cm.cn(cm.spreadsheetGridRoot, cm.spreadsheetGridRootBorder),
    rootStyle: `width: ${px(geometry.viewportWidth)}; height: ${px(
      geometry.viewportHeight,
    )}; position: relative; overflow: hidden; outline: none;`,
    cornerClasses: cm.spreadsheetGridCorner,
    cornerStyle: `position: absolute; left: ${px(0)}; top: ${px(0)}; width: ${px(
      gutterWidth,
    )}; height: ${px(headerHeight)};`,
    headerLaneClasses: cm.spreadsheetGridLane,
    headerLaneStyle: `position: absolute; left: ${px(gutterWidth)}; top: ${px(
      0,
    )}; width: ${px(geometry.viewportWidth - gutterWidth)}; height: ${px(
      headerHeight,
    )}; overflow: hidden;`,
    headerScrollerStyle: `position: absolute; left: ${px(
      frozenColsWidth - geometry.scrollLeft,
    )}; top: ${px(0)}; width: ${px(totalScrollWidth)}; height: ${px(headerHeight)};`,
    frozenHeaderCells: frozenColumns.map((col) => ({
      key: `hdr-frozen-${col}`,
      index: col,
      text: columnLetter(col),
      style: headerCellStyle(col * cellWidth),
      classes: headerCellClasses,
    })),
    scrollingHeaderCells: visibleCols.map((col) => ({
      key: `hdr-${col}`,
      index: col,
      text: columnLetter(col),
      style: headerCellStyle((col - frozenCols) * cellWidth),
      classes: headerCellClasses,
    })),
    gutterLaneClasses: cm.spreadsheetGridLane,
    gutterLaneStyle: `position: absolute; left: ${px(0)}; top: ${px(
      headerHeight,
    )}; width: ${px(gutterWidth)}; height: ${px(
      geometry.viewportHeight - headerHeight,
    )}; overflow: hidden;`,
    gutterScrollerStyle: `position: absolute; left: ${px(0)}; top: ${px(
      frozenRowsHeight - geometry.scrollTop,
    )}; width: ${px(gutterWidth)}; height: ${px(totalScrollHeight)};`,
    frozenGutterCells: frozenRowIndices.map((row) => ({
      key: `gutter-frozen-${row}`,
      index: row,
      text: String(row + 1),
      style: gutterCellStyle(row * cellHeight, gutterWidth, cellHeight),
      classes: headerCellClasses,
    })),
    scrollingGutterCells: visibleRows.map((row) => ({
      key: `gutter-${row}`,
      index: row,
      text: String(row + 1),
      style: gutterCellStyle((row - frozenRows) * cellHeight, gutterWidth, cellHeight),
      classes: headerCellClasses,
    })),
    showFrozenRows: frozenRows > 0,
    showFrozenCols: frozenCols > 0,
    showFrozenCorner: frozenRows > 0 && frozenCols > 0,
    frozenRowsRegionStyle: `position: absolute; left: ${px(
      gutterWidth + frozenColsWidth,
    )}; top: ${px(headerHeight)}; width: ${px(scrollableWidth)}; height: ${px(
      frozenRowsHeight,
    )}; overflow: hidden;`,
    frozenRowsInnerStyle: `position: absolute; left: ${px(
      -geometry.scrollLeft,
    )}; top: ${px(0)}; width: ${px(totalScrollWidth)}; height: ${px(frozenRowsHeight)};`,
    frozenColsRegionStyle: `position: absolute; left: ${px(gutterWidth)}; top: ${px(
      headerHeight + frozenRowsHeight,
    )}; width: ${px(frozenColsWidth)}; height: ${px(scrollableHeight)}; overflow: hidden;`,
    frozenColsInnerStyle: `position: absolute; left: ${px(0)}; top: ${px(
      -geometry.scrollTop,
    )}; width: ${px(frozenColsWidth)}; height: ${px(totalScrollHeight)};`,
    frozenCornerStyle: `position: absolute; left: ${px(gutterWidth)}; top: ${px(
      headerHeight,
    )}; width: ${px(frozenColsWidth)}; height: ${px(frozenRowsHeight)}; overflow: hidden;`,
    frozenRowsCells,
    frozenColsCells,
    frozenCornerCells,
    mainCells,
    byRef: new Map(
      [...frozenRowsCells, ...frozenColsCells, ...frozenCornerCells, ...mainCells].map((cell) => [
        cell.ref,
        cell,
      ]),
    ),
    scrollRegionStyle: `position: absolute; left: ${px(
      gutterWidth + frozenColsWidth,
    )}; top: ${px(headerHeight + frozenRowsHeight)}; width: ${px(scrollableWidth)}; height: ${px(
      scrollableHeight,
    )}; overflow: auto;`,
    scrollSpacerStyle: `width: ${px(totalScrollWidth)}; height: ${px(
      totalScrollHeight,
    )}; position: relative;`,
    totalClasses: cm.cn(cm.displayBlock),
    totalStyle: `position: absolute; left: ${px(-10000)}; top: ${px(-10000)};`,
    totalText: `${totalGridWidth}×${totalGridHeight}`,
    editorClasses: cm.cn(cm.w('full'), cm.h('full'), cm.spreadsheetGridCellEditor),
    contentClasses: cm.cn(
      cm.w('full'),
      cm.h('full'),
      cm.spreadsheetGridCellContent,
      cm.textSize('sm'),
    ),
  }
}
