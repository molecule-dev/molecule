/**
 * Solid spreadsheet grid: a virtualized cell grid with frozen rows/columns,
 * range selection, copy/paste as TSV and in-cell editing.
 *
 * Solid counterpart of `@molecule/app-spreadsheet-grid-react`'s
 * `SpreadsheetGrid` — the same props (React names), the same DOM for the same
 * input, and the same callbacks.
 *
 * @module
 */

import { type Component, createMemo, createSignal, For, type JSX, onMount, Show } from 'solid-js'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { computeLayout, type GridCell, type GridGeometry, type GridHeaderCell } from './layout.js'
import type { CellValue, SpreadsheetGridProps } from './types.js'
import {
  cellRef,
  formatCellValue,
  normalizeSelection,
  parseClipboardTsv,
  serializeSelectionTsv,
} from './utilities.js'

/** The open in-cell editor. */
interface Editing {
  /** 0-indexed row of the edited cell. */
  row: number
  /** 0-indexed column of the edited cell. */
  col: number
  /** The draft text the editor shows. */
  draft: string
}

/** Props of the in-cell editor. */
interface CellEditorProps {
  /** The `data-mol-id` of the input. */
  identifier: string
  /** The draft text. */
  draft: string
  /** The input's classes. */
  classes: string
  /** The input's accessible label. */
  ariaLabel: string
  /** Receives each typed value. */
  onDraft: (value: string) => void
  /** Commits the draft. */
  onCommit: () => void
  /** Closes the editor without committing. */
  onCancel: () => void
}

/**
 * The in-cell editor. React mounts it when editing starts, so focusing and
 * selecting its text on mount is React's `useEffect(… focus(); select() …)`.
 *
 * @param props - See {@link CellEditorProps}.
 * @returns The editor input.
 */
const CellEditor: Component<CellEditorProps> = (props) => {
  let field: HTMLInputElement | undefined

  onMount(() => {
    if (!field) return
    field.focus()
    field.select()
  })

  return (
    <input
      ref={(element) => {
        field = element
      }}
      data-mol-id={props.identifier}
      class={props.classes}
      value={props.draft}
      attr:value={props.draft}
      onInput={(event) => props.onDraft((event.target as HTMLInputElement).value)}
      onBlur={() => props.onCommit()}
      onKeyDown={(event) => {
        // The grid's own key handler runs only while no editor is open (React
        // reads the state the render before the event began, so a key that
        // commits here never reaches it): keep the event on the field, as that
        // guard does.
        event.stopPropagation()
        if (event.key === 'Enter') {
          event.preventDefault()
          props.onCommit()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          props.onCancel()
        }
      }}
      aria-label={props.ariaLabel}
    />
  )
}

/**
 * One cell's stable identity: created once per A1 reference and reused while
 * that reference is rendered, so Solid's `<For>` keys the rendered cell the way
 * React keys it (by reference) instead of re-creating every cell on each render.
 */
interface CellRecord {
  /** The cell's A1 reference. */
  ref: string
  /** 0-indexed row. */
  row: number
  /** 0-indexed column. */
  col: number
}

/**
 * High-performance virtualized spreadsheet cell grid.
 *
 * Renders an `rows × columns` grid backed by a sparse `Map<cellRef, value>`,
 * with frozen rows/columns, range selection (click + drag, Shift+click),
 * copy/paste through the system clipboard as TSV, and in-cell editing
 * (double-click → input; Enter commits, Escape cancels).
 *
 * Only the cells inside the visible viewport (plus a small overscan margin)
 * are rendered, so 10k × 10k grids stay responsive.
 *
 * @param props - Component props (see {@link SpreadsheetGridProps}).
 * @returns The rendered spreadsheet grid.
 */
export const SpreadsheetGrid: Component<SpreadsheetGridProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [scrollLeft, setScrollLeft] = createSignal(0)
  const [scrollTop, setScrollTop] = createSignal(0)
  const [editing, setEditing] = createSignal<Editing | null>(null)
  /** Where the current drag started, while a mouse button is held. */
  let dragAnchor: { row: number; col: number } | null = null

  /**
   * The current geometry from the props and the grid's own state.
   *
   * @returns The geometry.
   */
  const geometry = (): GridGeometry => ({
    rows: props.rows,
    columns: props.columns,
    cells: props.cells,
    selection: props.selection,
    frozenRows: props.frozenRows ?? 0,
    frozenCols: props.frozenCols ?? 0,
    cellWidth: props.cellWidth ?? 96,
    cellHeight: props.cellHeight ?? 28,
    gutterWidth: props.gutterWidth ?? 48,
    headerHeight: props.headerHeight ?? 28,
    viewportWidth: props.viewportWidth ?? 720,
    viewportHeight: props.viewportHeight ?? 360,
    scrollLeft: scrollLeft(),
    scrollTop: scrollTop(),
    editing: editing(),
  })

  /** The current layout plan. */
  const layout = createMemo(() => computeLayout(geometry(), cm))

  /** One stable record per rendered cell reference. */
  const records = new Map<string, CellRecord>()

  /**
   * The stable record of one cell, created on first sight.
   *
   * @param cell - The cell.
   * @returns Its record.
   */
  const itemFor = (cell: GridCell): CellRecord => {
    let record = records.get(cell.ref)
    if (!record) {
      record = { ref: cell.ref, row: cell.row, col: cell.col }
      records.set(cell.ref, record)
    }
    return record
  }

  /**
   * The editor state of one cell, when that cell is the one being edited.
   *
   * @param row - 0-indexed row.
   * @param col - 0-indexed column.
   * @returns The editor state, or null.
   */
  const editorAt = (row: number, col: number): Editing | null => {
    const current = editing()
    return current && current.row === row && current.col === col ? current : null
  }

  /**
   * Opens the in-cell editor on one cell, seeding the draft from its value.
   *
   * @param row - 0-indexed row.
   * @param col - 0-indexed column.
   */
  const beginEdit = (row: number, col: number): void => {
    setEditing({ row, col, draft: formatCellValue(props.cells.get(cellRef(row, col))) })
  }

  /** Commits the open edit: empty clears the cell, number-like text becomes a number. */
  const commitEdit = (): void => {
    const current = editing()
    if (!current) return
    const ref = cellRef(current.row, current.col)
    const trimmed = current.draft
    let next: CellValue
    if (trimmed === '') next = null
    else if (/^-?\d+(\.\d+)?$/.test(trimmed)) next = Number(trimmed)
    else next = trimmed
    props.onCellChange(ref, next)
    setEditing(null)
  }

  /** Closes the editor without committing. */
  const cancelEdit = (): void => {
    setEditing(null)
  }

  /**
   * React's cell `onMouseDown`: commits an open edit, then starts or extends
   * the selection.
   *
   * @param row - 0-indexed row.
   * @param col - 0-indexed column.
   * @param shiftKey - Whether Shift was held (extend from the anchor).
   */
  const handleMouseDown = (row: number, col: number, shiftKey: boolean): void => {
    if (editing()) commitEdit()
    if (shiftKey) {
      props.onSelectionChange({
        r1: props.selection.r1,
        c1: props.selection.c1,
        r2: row,
        c2: col,
      })
    } else {
      dragAnchor = { row, col }
      props.onSelectionChange({ r1: row, c1: col, r2: row, c2: col })
    }
  }

  /**
   * React's cell `onMouseEnter`: extends the selection while the primary
   * button is held.
   *
   * @param row - 0-indexed row.
   * @param col - 0-indexed column.
   * @param buttonsDown - Whether the primary button is held.
   */
  const handleMouseEnter = (row: number, col: number, buttonsDown: boolean): void => {
    if (!buttonsDown) return
    const anchor = dragAnchor
    if (!anchor) return
    props.onSelectionChange({ r1: anchor.row, c1: anchor.col, r2: row, c2: col })
  }

  /** Clears the drag anchor on mouse up. */
  const handleMouseUp = (): void => {
    dragAnchor = null
  }

  /**
   * Serializes the selection to TSV and copies it through the clipboard bond.
   *
   * @returns The TSV text.
   */
  const handleCopy = async (): Promise<string> => {
    const tsv = serializeSelectionTsv(props.cells, props.selection)
    await copyTextWithFallback(tsv)
    return tsv
  }

  /**
   * Writes pasted TSV into cells starting at the selection anchor.
   *
   * @param text - Clipboard text (typically TSV).
   */
  const handlePaste = (text: string): void => {
    const grid = parseClipboardTsv(text)
    if (grid.length === 0) return
    const n = normalizeSelection(props.selection)
    for (let r = 0; r < grid.length; r += 1) {
      const row = grid[r]!
      for (let c = 0; c < row.length; c += 1) {
        const targetRow = n.r1 + r
        const targetCol = n.c1 + c
        if (targetRow >= props.rows || targetCol >= props.columns) continue
        const raw = row[c]!
        let next: CellValue
        if (raw === '') next = null
        else if (/^-?\d+(\.\d+)?$/.test(raw)) next = Number(raw)
        else next = raw
        props.onCellChange(cellRef(targetRow, targetCol), next)
      }
    }
  }

  /**
   * React's container `onKeyDown`: copy, and Edit on Enter / F2.
   *
   * @param event - The keyboard event.
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    const isMod = event.ctrlKey || event.metaKey
    if (editing()) return
    if (isMod && event.key.toLowerCase() === 'c') {
      event.preventDefault()
      void handleCopy()
      return
    }
    if (isMod && event.key.toLowerCase() === 'v') return
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault()
      beginEdit(props.selection.r1, props.selection.c1)
    }
  }

  /**
   * React's container `onPaste`: intercepts the native paste event.
   *
   * @param event - The clipboard event.
   */
  const handlePasteEvent = (event: ClipboardEvent): void => {
    const text = event.clipboardData ? event.clipboardData.getData('text/plain') : ''
    if (!text) return
    event.preventDefault()
    handlePaste(text)
  }

  /**
   * Renders one column-letter or row-number label.
   *
   * @param cell - The label.
   * @param role - The ARIA role the label carries (`columnheader`), if any.
   * @returns The label element.
   */
  const headerBox = (cell: GridHeaderCell, role?: 'columnheader'): JSX.Element => (
    <div
      role={role}
      aria-colindex={role ? cell.index + 1 : undefined}
      class={cell.classes}
      style={cell.style}
    >
      {cell.text}
    </div>
  )

  /**
   * The content React renders for a cell without an editor.
   *
   * @param record - The cell's record.
   * @returns The cell's renderer output, or its display text.
   */
  const cellContent = (record: CellRecord): JSX.Element => {
    const cell = layout().byRef.get(record.ref)
    return props.renderCell ? props.renderCell(cell?.value, record.ref) : (cell?.text ?? '')
  }

  /**
   * Renders one cell box: its editor while it is being edited, its content
   * otherwise. The record keeps the element stable across renders; its
   * attributes and content read the current plan reactively.
   *
   * @param record - The cell's record.
   * @returns The cell element.
   */
  const cellBox = (record: CellRecord): JSX.Element => {
    const cell = (): GridCell | undefined => layout().byRef.get(record.ref)
    return (
      <div
        role="gridcell"
        data-mol-id={`spreadsheet-grid-cell-${record.ref}`}
        // Roving tabindex per the WAI-ARIA grid pattern: exactly one cell —
        // the selection anchor — is in the tab order.
        tabindex={cell()?.anchor ? 0 : -1}
        aria-selected={cell()?.selected ? 'true' : undefined}
        class={cell()?.classes}
        style={cell()?.style}
        onMouseDown={(event) => handleMouseDown(record.row, record.col, event.shiftKey)}
        onMouseEnter={(event) => handleMouseEnter(record.row, record.col, event.buttons === 1)}
        onDblClick={() => beginEdit(record.row, record.col)}
      >
        <Show
          when={editorAt(record.row, record.col)}
          fallback={<div class={layout().contentClasses}>{cellContent(record)}</div>}
        >
          {(open) => (
            <CellEditor
              identifier={`spreadsheet-grid-editor-${record.ref}`}
              draft={open().draft}
              classes={layout().editorClasses}
              ariaLabel={t(
                'spreadsheetGrid.cellEditor',
                { ref: record.ref },
                {
                  defaultValue: 'Edit cell {{ref}}',
                },
              )}
              onDraft={(draft) => {
                const current = editorAt(record.row, record.col)
                if (current) setEditing({ ...current, draft })
              }}
              onCommit={() => commitEdit()}
              onCancel={() => cancelEdit()}
            />
          )}
        </Show>
      </div>
    )
  }

  /**
   * One region's cell records, created per render from the current plan.
   *
   * @param cells - The region's cells.
   * @returns Their stable records.
   */
  const recordsFor = (cells: GridCell[]): CellRecord[] => cells.map(itemFor)

  return (
    <div
      data-mol-id={props.dataMolId ?? 'spreadsheet-grid'}
      role="grid"
      tabindex={0}
      aria-rowcount={props.rows}
      aria-colcount={props.columns}
      aria-label={t('spreadsheetGrid.label', undefined, { defaultValue: 'Spreadsheet' })}
      class={layout().rootClasses}
      style={layout().rootStyle}
      onKeyDown={(event) => handleKeyDown(event)}
      onPaste={(event) => handlePasteEvent(event)}
      onMouseUp={() => handleMouseUp()}
    >
      {/* Top-left corner (gutter × header). */}
      <div aria-hidden="true" class={layout().cornerClasses} style={layout().cornerStyle} />
      {/* Column-letter header (frozen + scrollable). */}
      <div
        role="row"
        aria-rowindex={1}
        class={layout().headerLaneClasses}
        style={layout().headerLaneStyle}
      >
        <For each={layout().frozenHeaderCells}>{(cell) => headerBox(cell, 'columnheader')}</For>
        <div style={layout().headerScrollerStyle}>
          <For each={layout().scrollingHeaderCells}>
            {(cell) => headerBox(cell, 'columnheader')}
          </For>
        </div>
      </div>
      {/* Row-number gutter (frozen + scrollable). */}
      <div aria-hidden="true" class={layout().gutterLaneClasses} style={layout().gutterLaneStyle}>
        <For each={layout().frozenGutterCells}>{(cell) => headerBox(cell)}</For>
        <div style={layout().gutterScrollerStyle}>
          <For each={layout().scrollingGutterCells}>{(cell) => headerBox(cell)}</For>
        </div>
      </div>
      {/* Frozen-rows × scrolling-cols region. */}
      <Show when={layout().showFrozenRows}>
        <div style={layout().frozenRowsRegionStyle}>
          <div style={layout().frozenRowsInnerStyle}>
            <For each={recordsFor(layout().frozenRowsCells)}>{(record) => cellBox(record)}</For>
          </div>
        </div>
      </Show>
      {/* Frozen-cols × scrolling-rows region. */}
      <Show when={layout().showFrozenCols}>
        <div style={layout().frozenColsRegionStyle}>
          <div style={layout().frozenColsInnerStyle}>
            <For each={recordsFor(layout().frozenColsCells)}>{(record) => cellBox(record)}</For>
          </div>
        </div>
      </Show>
      {/* Frozen-rows × frozen-cols corner. */}
      <Show when={layout().showFrozenCorner}>
        <div style={layout().frozenCornerStyle}>
          <For each={recordsFor(layout().frozenCornerCells)}>{(record) => cellBox(record)}</For>
        </div>
      </Show>
      {/* Main scrollable region. */}
      <div
        data-mol-id="spreadsheet-grid-scroll"
        style={layout().scrollRegionStyle}
        onScroll={(event) => {
          const element = event.currentTarget as HTMLDivElement
          setScrollLeft(element.scrollLeft)
          setScrollTop(element.scrollTop)
        }}
      >
        <div style={layout().scrollSpacerStyle}>
          <For each={recordsFor(layout().mainCells)}>{(record) => cellBox(record)}</For>
        </div>
      </div>
      {/* Hidden total-size hint for accessibility tooling. */}
      <span class={layout().totalClasses} style={layout().totalStyle} aria-hidden="true">
        {layout().totalText}
      </span>
    </div>
  )
}
