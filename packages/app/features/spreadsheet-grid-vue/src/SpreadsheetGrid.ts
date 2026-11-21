/**
 * Vue spreadsheet grid: a virtualized cell grid with frozen rows/columns,
 * range selection, copy/paste as TSV and in-cell editing, rendered with `h()`.
 *
 * Vue counterpart of `@molecule/app-spreadsheet-grid-react`'s `SpreadsheetGrid`
 * — the same props (React names), the same DOM for the same input, and the
 * same callbacks.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, type VNodeChild, watch } from 'vue'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import {
  computeLayout,
  type GridCell,
  type GridGeometry,
  type GridHeaderCell,
  type GridLayout,
} from './layout.js'
import type { CellMap, CellValue, SpreadsheetGridProps, SpreadsheetSelection } from './types.js'
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
 * @returns The spreadsheet grid component.
 */
export const SpreadsheetGrid = defineComponent({
  name: 'SpreadsheetGrid',
  props: {
    rows: { type: Number, required: true },
    columns: { type: Number, required: true },
    cells: { type: Object as PropType<CellMap>, required: true },
    onCellChange: {
      type: Function as PropType<SpreadsheetGridProps['onCellChange']>,
      required: true,
    },
    selection: { type: Object as PropType<SpreadsheetSelection>, required: true },
    onSelectionChange: {
      type: Function as PropType<SpreadsheetGridProps['onSelectionChange']>,
      required: true,
    },
    frozenRows: { type: Number, default: 0 },
    frozenCols: { type: Number, default: 0 },
    cellWidth: { type: Number, default: 96 },
    cellHeight: { type: Number, default: 28 },
    gutterWidth: { type: Number, default: 48 },
    headerHeight: { type: Number, default: 28 },
    viewportWidth: { type: Number, default: 720 },
    viewportHeight: { type: Number, default: 360 },
    dataMolId: String,
    renderCell: Function as PropType<SpreadsheetGridProps['renderCell']>,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const scrollLeft = ref(0)
    const scrollTop = ref(0)
    const editing = ref<Editing | null>(null)
    /** The editor field, focused and selected once each time editing starts. */
    const editInput = ref<HTMLInputElement | null>(null)
    /** Where the current drag started, while a mouse button is held. */
    let dragAnchor: { row: number; col: number } | null = null

    // React's `useEffect(() => { focus(); select() }, [editing])`.
    watch(
      editing,
      (now) => {
        if (!now) return
        const field = editInput.value
        field?.focus()
        field?.select()
      },
      { flush: 'post' },
    )

    /**
     * Opens the in-cell editor on one cell, seeding the draft from its value.
     *
     * @param row - 0-indexed row.
     * @param col - 0-indexed column.
     */
    const beginEdit = (row: number, col: number): void => {
      editing.value = {
        row,
        col,
        draft: formatCellValue(props.cells.get(cellRef(row, col))),
      }
    }

    /** Commits the open edit: empty clears the cell, number-like text becomes a number. */
    const commitEdit = (): void => {
      const current = editing.value
      if (!current) return
      const ref = cellRef(current.row, current.col)
      const trimmed = current.draft
      let next: CellValue
      if (trimmed === '') next = null
      else if (/^-?\d+(\.\d+)?$/.test(trimmed)) next = Number(trimmed)
      else next = trimmed
      props.onCellChange(ref, next)
      editing.value = null
    }

    /** Closes the editor without committing. */
    const cancelEdit = (): void => {
      editing.value = null
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
      if (editing.value) commitEdit()
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
      if (editing.value) return
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
    const headerVnode = (cell: GridHeaderCell, role?: string): VNode =>
      h(
        'div',
        {
          key: cell.key,
          ...(role ? { role, 'aria-colindex': cell.index + 1 } : {}),
          class: cell.classes,
          style: cell.style,
        },
        cell.text,
      )

    /**
     * Renders one cell box: its editor while it is being edited, its content
     * otherwise.
     *
     * @param cell - The cell.
     * @param layout - The current layout plan.
     * @returns The cell element.
     */
    const cellVnode = (cell: GridCell, layout: GridLayout): VNode => {
      const current = editing.value
      const isEditing = current !== null && current.row === cell.row && current.col === cell.col
      let child: VNodeChild
      if (isEditing && current) {
        child = h('input', {
          ref: editInput,
          'data-mol-id': `spreadsheet-grid-editor-${cell.ref}`,
          class: layout.editorClasses,
          value: current.draft,
          onInput: (event: Event) => {
            const open = editing.value
            if (!open) return
            editing.value = { ...open, draft: (event.target as HTMLInputElement).value }
          },
          onBlur: commitEdit,
          onKeydown: (event: KeyboardEvent) => {
            // The grid's own key handler runs only while no editor is open
            // (React reads the state the render before the event began, so a
            // key that commits here never reaches it): keep the event on the
            // field, as that guard does.
            event.stopPropagation()
            if (event.key === 'Enter') {
              event.preventDefault()
              commitEdit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              cancelEdit()
            }
          },
          'aria-label': t(
            'spreadsheetGrid.cellEditor',
            { ref: cell.ref },
            {
              defaultValue: 'Edit cell {{ref}}',
            },
          ),
        })
      } else {
        child = h('div', { class: layout.contentClasses }, [
          props.renderCell ? props.renderCell(cell.value, cell.ref) : cell.text,
        ])
      }
      return h(
        'div',
        {
          key: cell.ref,
          role: 'gridcell',
          'data-mol-id': `spreadsheet-grid-cell-${cell.ref}`,
          // Roving tabindex per the WAI-ARIA grid pattern: exactly one cell —
          // the selection anchor — is in the tab order.
          tabindex: cell.anchor ? 0 : -1,
          'aria-selected': cell.selected ? 'true' : undefined,
          class: cell.classes,
          style: cell.style,
          onMousedown: (event: MouseEvent) => handleMouseDown(cell.row, cell.col, event.shiftKey),
          onMouseenter: (event: MouseEvent) =>
            handleMouseEnter(cell.row, cell.col, event.buttons === 1),
          onDblclick: () => beginEdit(cell.row, cell.col),
        },
        [child],
      )
    }

    /**
     * Builds the current geometry from the props and the grid's own state.
     *
     * @returns The geometry.
     */
    const geometry = (): GridGeometry => ({
      rows: props.rows,
      columns: props.columns,
      cells: props.cells,
      selection: props.selection,
      frozenRows: props.frozenRows,
      frozenCols: props.frozenCols,
      cellWidth: props.cellWidth,
      cellHeight: props.cellHeight,
      gutterWidth: props.gutterWidth,
      headerHeight: props.headerHeight,
      viewportWidth: props.viewportWidth,
      viewportHeight: props.viewportHeight,
      scrollLeft: scrollLeft.value,
      scrollTop: scrollTop.value,
      editing: editing.value,
    })

    return (): VNode => {
      const layout = computeLayout(geometry(), cm)

      return h(
        'div',
        {
          'data-mol-id': props.dataMolId ?? 'spreadsheet-grid',
          role: 'grid',
          tabindex: 0,
          'aria-rowcount': props.rows,
          'aria-colcount': props.columns,
          'aria-label': t('spreadsheetGrid.label', undefined, { defaultValue: 'Spreadsheet' }),
          class: layout.rootClasses,
          style: layout.rootStyle,
          onKeydown: handleKeyDown,
          onPaste: handlePasteEvent,
          onMouseup: handleMouseUp,
        },
        [
          // Top-left corner (gutter × header).
          h('div', {
            'aria-hidden': 'true',
            class: layout.cornerClasses,
            style: layout.cornerStyle,
          }),
          // Column-letter header (frozen + scrollable).
          h(
            'div',
            {
              role: 'row',
              'aria-rowindex': 1,
              class: layout.headerLaneClasses,
              style: layout.headerLaneStyle,
            },
            [
              ...layout.frozenHeaderCells.map((cell) => headerVnode(cell, 'columnheader')),
              h(
                'div',
                { style: layout.headerScrollerStyle },
                layout.scrollingHeaderCells.map((cell) => headerVnode(cell, 'columnheader')),
              ),
            ],
          ),
          // Row-number gutter (frozen + scrollable).
          h(
            'div',
            {
              'aria-hidden': 'true',
              class: layout.gutterLaneClasses,
              style: layout.gutterLaneStyle,
            },
            [
              ...layout.frozenGutterCells.map((cell) => headerVnode(cell)),
              h(
                'div',
                { style: layout.gutterScrollerStyle },
                layout.scrollingGutterCells.map((cell) => headerVnode(cell)),
              ),
            ],
          ),
          // Frozen-rows × scrolling-cols region.
          ...(layout.showFrozenRows
            ? [
                h('div', { style: layout.frozenRowsRegionStyle }, [
                  h(
                    'div',
                    { style: layout.frozenRowsInnerStyle },
                    layout.frozenRowsCells.map((cell) => cellVnode(cell, layout)),
                  ),
                ]),
              ]
            : []),
          // Frozen-cols × scrolling-rows region.
          ...(layout.showFrozenCols
            ? [
                h('div', { style: layout.frozenColsRegionStyle }, [
                  h(
                    'div',
                    { style: layout.frozenColsInnerStyle },
                    layout.frozenColsCells.map((cell) => cellVnode(cell, layout)),
                  ),
                ]),
              ]
            : []),
          // Frozen-rows × frozen-cols corner.
          ...(layout.showFrozenCorner
            ? [
                h(
                  'div',
                  { style: layout.frozenCornerStyle },
                  layout.frozenCornerCells.map((cell) => cellVnode(cell, layout)),
                ),
              ]
            : []),
          // Main scrollable region.
          h(
            'div',
            {
              'data-mol-id': 'spreadsheet-grid-scroll',
              style: layout.scrollRegionStyle,
              onScroll: (event: Event) => {
                const element = event.currentTarget as HTMLDivElement
                scrollLeft.value = element.scrollLeft
                scrollTop.value = element.scrollTop
              },
            },
            [
              h(
                'div',
                { style: layout.scrollSpacerStyle },
                layout.mainCells.map((cell) => cellVnode(cell, layout)),
              ),
            ],
          ),
          // Hidden total-size hint for accessibility tooling.
          h(
            'span',
            {
              class: layout.totalClasses,
              style: layout.totalStyle,
              'aria-hidden': 'true',
            },
            layout.totalText,
          ),
        ],
      )
    }
  },
})
