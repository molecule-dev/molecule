import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type { CellMap, CellRef, CellValue, SpreadsheetSelection } from './types.js'
import {
  cellRef,
  columnLetter,
  computeVisibleRange,
  formatCellValue,
  isInSelection,
  normalizeSelection,
  parseClipboardTsv,
  serializeSelectionTsv,
} from './utilities.js'

/**
 * Props for `<SpreadsheetGrid>`.
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
   * Optional cell renderer. Receives the cached display string plus the
   * raw value. Defaults to plain text. Use to render formula results
   * (`'=A1+B1'` → evaluated number) or custom formatting.
   */
  renderCell?: (value: CellValue | undefined, ref: CellRef) => ReactElement | string
}

/**
 * High-performance virtualized spreadsheet cell grid.
 *
 * Renders an `rows × columns` grid backed by a sparse `Map<cellRef, value>`,
 * with frozen rows/columns, range selection (click + drag, Shift+click),
 * copy/paste through the system clipboard as TSV, and in-cell editing
 * (double-click → input; Enter commits, Escape cancels).
 *
 * Only the cells inside the visible viewport (plus a small overscan
 * margin) are rendered, so 10k × 10k grids stay responsive.
 *
 * Pairs with `@molecule/api-formula-engine` for formula evaluation —
 * pass an evaluated `cells` map and a `renderCell` that can look up
 * formula results.
 *
 * @param props - Component props (see {@link SpreadsheetGridProps}).
 * @returns The rendered grid.
 */
export function SpreadsheetGrid(props: SpreadsheetGridProps): ReactElement {
  const {
    rows,
    columns,
    cells,
    onCellChange,
    selection,
    onSelectionChange,
    frozenRows = 0,
    frozenCols = 0,
    cellWidth = 96,
    cellHeight = 28,
    gutterWidth = 48,
    headerHeight = 28,
    viewportWidth = 720,
    viewportHeight = 360,
    dataMolId,
    renderCell,
  } = props
  const cm = getClassMap()
  const { t } = useTranslation()

  const containerRef = useRef<HTMLDivElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const dragAnchorRef = useRef<{ row: number; col: number } | null>(null)

  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [editing, setEditing] = useState<{ row: number; col: number; draft: string } | null>(null)

  const frozenRowsHeight = frozenRows * cellHeight
  const frozenColsWidth = frozenCols * cellWidth
  const scrollableViewportWidth = Math.max(0, viewportWidth - gutterWidth - frozenColsWidth)
  const scrollableViewportHeight = Math.max(0, viewportHeight - headerHeight - frozenRowsHeight)

  const [colStart, colEnd] = useMemo(
    () =>
      computeVisibleRange(
        scrollLeft,
        scrollableViewportWidth,
        cellWidth,
        Math.max(0, columns - frozenCols),
      ),
    [scrollLeft, scrollableViewportWidth, cellWidth, columns, frozenCols],
  )
  const [rowStart, rowEnd] = useMemo(
    () =>
      computeVisibleRange(
        scrollTop,
        scrollableViewportHeight,
        cellHeight,
        Math.max(0, rows - frozenRows),
      ),
    [scrollTop, scrollableViewportHeight, cellHeight, rows, frozenRows],
  )

  // Visible-cell column / row indices (absolute), excluding frozen.
  const visibleCols = useMemo(() => {
    const out: number[] = []
    for (let c = frozenCols + colStart; c <= frozenCols + colEnd; c += 1) {
      if (c >= columns) break
      out.push(c)
    }
    return out
  }, [colStart, colEnd, columns, frozenCols])

  const visibleRows = useMemo(() => {
    const out: number[] = []
    for (let r = frozenRows + rowStart; r <= frozenRows + rowEnd; r += 1) {
      if (r >= rows) break
      out.push(r)
    }
    return out
  }, [rowStart, rowEnd, rows, frozenRows])

  const frozenColIndices = useMemo(
    () => Array.from({ length: Math.min(frozenCols, columns) }, (_, i) => i),
    [frozenCols, columns],
  )
  const frozenRowIndices = useMemo(
    () => Array.from({ length: Math.min(frozenRows, rows) }, (_, i) => i),
    [frozenRows, rows],
  )

  const beginEdit = useCallback(
    (row: number, col: number) => {
      const ref = cellRef(row, col)
      const draft = formatCellValue(cells.get(ref))
      setEditing({ row, col, draft })
    },
    [cells],
  )

  const commitEdit = useCallback(() => {
    if (!editing) return
    const ref = cellRef(editing.row, editing.col)
    const trimmed = editing.draft
    let next: CellValue
    if (trimmed === '') {
      next = null
    } else if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      next = Number(trimmed)
    } else {
      next = trimmed
    }
    onCellChange(ref, next)
    setEditing(null)
  }, [editing, onCellChange])

  const cancelEdit = useCallback(() => {
    setEditing(null)
  }, [])

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editing])

  const handleMouseDown = useCallback(
    (row: number, col: number, shiftKey: boolean) => {
      if (editing) commitEdit()
      if (shiftKey) {
        onSelectionChange({ r1: selection.r1, c1: selection.c1, r2: row, c2: col })
      } else {
        dragAnchorRef.current = { row, col }
        onSelectionChange({ r1: row, c1: col, r2: row, c2: col })
      }
    },
    [commitEdit, editing, onSelectionChange, selection.c1, selection.r1],
  )

  const handleMouseEnter = useCallback(
    (row: number, col: number, buttonsDown: boolean) => {
      if (!buttonsDown) return
      const anchor = dragAnchorRef.current
      if (!anchor) return
      onSelectionChange({ r1: anchor.row, c1: anchor.col, r2: row, c2: col })
    },
    [onSelectionChange],
  )

  const handleMouseUp = useCallback(() => {
    dragAnchorRef.current = null
  }, [])

  const handleCopy = useCallback(async () => {
    const tsv = serializeSelectionTsv(cells, selection)
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(tsv)
      } catch {
        /* clipboard may be unavailable in some contexts; ignore */
      }
    }
    return tsv
  }, [cells, selection])

  const handlePaste = useCallback(
    (text: string) => {
      const grid = parseClipboardTsv(text)
      if (grid.length === 0) return
      const n = normalizeSelection(selection)
      for (let r = 0; r < grid.length; r += 1) {
        const row = grid[r]
        for (let c = 0; c < row.length; c += 1) {
          const targetRow = n.r1 + r
          const targetCol = n.c1 + c
          if (targetRow >= rows || targetCol >= columns) continue
          const raw = row[c]
          let next: CellValue
          if (raw === '') next = null
          else if (/^-?\d+(\.\d+)?$/.test(raw)) next = Number(raw)
          else next = raw
          onCellChange(cellRef(targetRow, targetCol), next)
        }
      }
    },
    [columns, onCellChange, rows, selection],
  )

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const isMod = event.ctrlKey || event.metaKey
      if (editing) return
      if (isMod && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        void handleCopy()
        return
      }
      if (isMod && event.key.toLowerCase() === 'v') {
        // Allow native paste event to populate clipboardData; intercept it instead.
        return
      }
      if (event.key === 'Enter' || event.key === 'F2') {
        event.preventDefault()
        beginEdit(selection.r1, selection.c1)
        return
      }
    },
    [beginEdit, editing, handleCopy, selection.c1, selection.r1],
  )

  const handlePasteEvent = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const text = event.clipboardData.getData('text/plain')
      if (!text) return
      event.preventDefault()
      handlePaste(text)
    },
    [handlePaste],
  )

  const totalGridWidth = gutterWidth + columns * cellWidth
  const totalGridHeight = headerHeight + rows * cellHeight
  const totalScrollWidth = Math.max(0, columns - frozenCols) * cellWidth
  const totalScrollHeight = Math.max(0, rows - frozenRows) * cellHeight

  const containerStyle: CSSProperties = {
    width: viewportWidth,
    height: viewportHeight,
    position: 'relative',
    overflow: 'hidden',
    outline: 'none',
  }

  // The scrollable region sits to the right of frozen-cols and below frozen-rows.
  const scrollRegionStyle: CSSProperties = {
    position: 'absolute',
    left: gutterWidth + frozenColsWidth,
    top: headerHeight + frozenRowsHeight,
    width: scrollableViewportWidth,
    height: scrollableViewportHeight,
    overflow: 'auto',
  }

  const scrollSpacerStyle: CSSProperties = {
    width: totalScrollWidth,
    height: totalScrollHeight,
    position: 'relative',
  }

  const renderCellContent = (row: number, col: number): ReactElement | string => {
    const ref = cellRef(row, col)
    const value = cells.get(ref)
    if (renderCell) return renderCell(value, ref)
    return formatCellValue(value)
  }

  /**
   * Render one cell `<div>` at an absolute position. Used for both
   * scrollable and frozen regions.
   */
  const renderCellBox = (row: number, col: number, leftPx: number, topPx: number): ReactElement => {
    const ref = cellRef(row, col)
    const isEditing = editing && editing.row === row && editing.col === col
    const inSel = isInSelection(selection, row, col)
    const isAnchor = selection.r1 === row && selection.c1 === col
    const style: CSSProperties = {
      position: 'absolute',
      left: leftPx,
      top: topPx,
      width: cellWidth,
      height: cellHeight,
      boxSizing: 'border-box',
    }
    return (
      <div
        key={ref}
        role="gridcell"
        data-mol-id={`spreadsheet-grid-cell-${ref}`}
        aria-selected={inSel || undefined}
        className={cm.cn(
          'border-r border-b border-outline-variant/20',
          inSel ? 'bg-primary/10' : 'bg-surface',
          isAnchor ? 'outline outline-2 outline-primary' : '',
        )}
        style={style}
        onMouseDown={(e) => handleMouseDown(row, col, e.shiftKey)}
        onMouseEnter={(e) => handleMouseEnter(row, col, e.buttons === 1)}
        onDoubleClick={() => beginEdit(row, col)}
      >
        {isEditing ? (
          <input
            ref={editInputRef}
            data-mol-id={`spreadsheet-grid-editor-${ref}`}
            className={cm.cn(cm.w('full'), cm.h('full'), 'px-1 outline-none bg-surface')}
            value={editing.draft}
            onChange={(e) => setEditing({ ...editing, draft: e.target.value })}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitEdit()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancelEdit()
              }
            }}
            aria-label={t(
              'spreadsheetGrid.cellEditor',
              { ref },
              {
                defaultValue: 'Edit cell {{ref}}',
              },
            )}
          />
        ) : (
          <div
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'px-1 truncate text-on-surface',
              cm.textSize('sm'),
            )}
          >
            {renderCellContent(row, col)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      data-mol-id={dataMolId ?? 'spreadsheet-grid'}
      role="grid"
      tabIndex={0}
      aria-rowcount={rows}
      aria-colcount={columns}
      aria-label={t('spreadsheetGrid.label', undefined, { defaultValue: 'Spreadsheet' })}
      className={cm.cn(
        'bg-surface text-on-surface select-none',
        'border border-outline-variant/30',
      )}
      style={containerStyle}
      onKeyDown={handleKeyDown}
      onPaste={handlePasteEvent}
      onMouseUp={handleMouseUp}
    >
      {/* Top-left corner (gutter × header). */}
      <div
        aria-hidden="true"
        className="bg-surface-container-low border-r border-b border-outline-variant/30"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: gutterWidth,
          height: headerHeight,
        }}
      />

      {/* Column-letter header (frozen + scrollable). */}
      <div
        role="row"
        aria-rowindex={1}
        className="bg-surface-container-low"
        style={{
          position: 'absolute',
          left: gutterWidth,
          top: 0,
          width: viewportWidth - gutterWidth,
          height: headerHeight,
          overflow: 'hidden',
        }}
      >
        {/* Frozen column letters. */}
        {frozenColIndices.map((col) => (
          <div
            key={`hdr-frozen-${col}`}
            role="columnheader"
            aria-colindex={col + 1}
            className={cm.cn(
              'border-r border-b border-outline-variant/30 text-on-surface-variant',
              cm.textCenter,
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
            )}
            style={{
              position: 'absolute',
              left: col * cellWidth,
              top: 0,
              width: cellWidth,
              height: headerHeight,
              lineHeight: `${headerHeight}px`,
            }}
          >
            {columnLetter(col)}
          </div>
        ))}
        {/* Scrolling column letters. */}
        <div
          style={{
            position: 'absolute',
            left: frozenColsWidth - scrollLeft,
            top: 0,
            width: totalScrollWidth,
            height: headerHeight,
          }}
        >
          {visibleCols.map((col) => (
            <div
              key={`hdr-${col}`}
              role="columnheader"
              aria-colindex={col + 1}
              className={cm.cn(
                'border-r border-b border-outline-variant/30 text-on-surface-variant',
                cm.textCenter,
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
              )}
              style={{
                position: 'absolute',
                left: (col - frozenCols) * cellWidth,
                top: 0,
                width: cellWidth,
                height: headerHeight,
                lineHeight: `${headerHeight}px`,
              }}
            >
              {columnLetter(col)}
            </div>
          ))}
        </div>
      </div>

      {/* Row-number gutter (frozen + scrollable). */}
      <div
        aria-hidden="true"
        className="bg-surface-container-low"
        style={{
          position: 'absolute',
          left: 0,
          top: headerHeight,
          width: gutterWidth,
          height: viewportHeight - headerHeight,
          overflow: 'hidden',
        }}
      >
        {frozenRowIndices.map((row) => (
          <div
            key={`gutter-frozen-${row}`}
            className={cm.cn(
              'border-r border-b border-outline-variant/30 text-on-surface-variant',
              cm.textCenter,
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
            )}
            style={{
              position: 'absolute',
              left: 0,
              top: row * cellHeight,
              width: gutterWidth,
              height: cellHeight,
              lineHeight: `${cellHeight}px`,
            }}
          >
            {row + 1}
          </div>
        ))}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: frozenRowsHeight - scrollTop,
            width: gutterWidth,
            height: totalScrollHeight,
          }}
        >
          {visibleRows.map((row) => (
            <div
              key={`gutter-${row}`}
              className={cm.cn(
                'border-r border-b border-outline-variant/30 text-on-surface-variant',
                cm.textCenter,
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
              )}
              style={{
                position: 'absolute',
                left: 0,
                top: (row - frozenRows) * cellHeight,
                width: gutterWidth,
                height: cellHeight,
                lineHeight: `${cellHeight}px`,
              }}
            >
              {row + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Frozen-rows × scrolling-cols region. */}
      {frozenRows > 0 && (
        <div
          style={{
            position: 'absolute',
            left: gutterWidth + frozenColsWidth,
            top: headerHeight,
            width: scrollableViewportWidth,
            height: frozenRowsHeight,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -scrollLeft,
              top: 0,
              width: totalScrollWidth,
              height: frozenRowsHeight,
            }}
          >
            {frozenRowIndices.map((row) =>
              visibleCols.map((col) =>
                renderCellBox(row, col, (col - frozenCols) * cellWidth, row * cellHeight),
              ),
            )}
          </div>
        </div>
      )}

      {/* Frozen-cols × scrolling-rows region. */}
      {frozenCols > 0 && (
        <div
          style={{
            position: 'absolute',
            left: gutterWidth,
            top: headerHeight + frozenRowsHeight,
            width: frozenColsWidth,
            height: scrollableViewportHeight,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: -scrollTop,
              width: frozenColsWidth,
              height: totalScrollHeight,
            }}
          >
            {frozenColIndices.map((col) =>
              visibleRows.map((row) =>
                renderCellBox(row, col, col * cellWidth, (row - frozenRows) * cellHeight),
              ),
            )}
          </div>
        </div>
      )}

      {/* Frozen-rows × frozen-cols corner. */}
      {frozenRows > 0 && frozenCols > 0 && (
        <div
          style={{
            position: 'absolute',
            left: gutterWidth,
            top: headerHeight,
            width: frozenColsWidth,
            height: frozenRowsHeight,
            overflow: 'hidden',
          }}
        >
          {frozenRowIndices.map((row) =>
            frozenColIndices.map((col) =>
              renderCellBox(row, col, col * cellWidth, row * cellHeight),
            ),
          )}
        </div>
      )}

      {/* Main scrollable region. */}
      <div
        data-mol-id="spreadsheet-grid-scroll"
        style={scrollRegionStyle}
        onScroll={(e) => {
          const el = e.currentTarget
          setScrollLeft(el.scrollLeft)
          setScrollTop(el.scrollTop)
        }}
      >
        <div style={scrollSpacerStyle}>
          {visibleRows.map((row) =>
            visibleCols.map((col) =>
              renderCellBox(
                row,
                col,
                (col - frozenCols) * cellWidth,
                (row - frozenRows) * cellHeight,
              ),
            ),
          )}
        </div>
      </div>

      {/* Hidden total-size hint for accessibility tooling. */}
      <span
        className={cm.cn(cm.displayBlock)}
        style={{ position: 'absolute', left: -10000, top: -10000 }}
        aria-hidden="true"
      >
        {totalGridWidth}×{totalGridHeight}
      </span>
    </div>
  )
}
