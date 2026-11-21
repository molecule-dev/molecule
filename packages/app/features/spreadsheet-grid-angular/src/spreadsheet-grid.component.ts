/**
 * SpreadsheetGrid component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  afterNextRender,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Injector,
  signal,
  type TemplateRef,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { computeLayout, type GridCell, type GridGeometry, type GridLayout } from './layout.js'
import type { CellMap, CellValue, SpreadsheetSelection } from './types.js'
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
 * Whether a node-valued input is an Angular template (an `ng-template`) rather
 * than a plain value. Checked structurally — `TemplateRef` is a type-only
 * import in the emitted metadata, so `instanceof` is not dependable across
 * bundles.
 *
 * @param value - The input value.
 * @returns True when it can be rendered with `ngTemplateOutlet`.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * SpreadsheetGrid component.
 *
 * High-performance virtualized spreadsheet cell grid: the host IS React's root
 * `<div role="grid">` (`div[mol-spreadsheet-grid]`), so no wrapper element
 * exists. Renders an `rows × columns` grid backed by a sparse
 * `Map<cellRef, value>`, with frozen rows/columns, range selection (click +
 * drag, Shift+click), copy/paste through the system clipboard as TSV, and
 * in-cell editing (double-click → input; Enter commits, Escape cancels).
 * Only the cells inside the visible viewport (plus a small overscan margin)
 * are rendered.
 *
 * React's callbacks are inputs (they keep their React names and their argument
 * lists); React's `renderCell` render prop is an `ng-template`.
 */
@Component({
  selector: 'div[mol-spreadsheet-grid]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'rows',
    'columns',
    'cells',
    'onCellChange',
    'selection',
    'onSelectionChange',
    'frozenRows',
    'frozenCols',
    'cellWidth',
    'cellHeight',
    'gutterWidth',
    'headerHeight',
    'viewportWidth',
    'viewportHeight',
    'dataMolId',
    'renderCell',
  ],
  host: {
    role: 'grid',
    '[attr.tabindex]': '0',
    '[attr.data-mol-id]': 'dataMolId ?? "spreadsheet-grid"',
    '[attr.aria-rowcount]': 'rows',
    '[attr.aria-colcount]': 'columns',
    '[attr.aria-label]': 'label()',
    '[class]': 'plan.rootClasses',
    '[style]': 'plan.rootStyle',
    '(keydown)': 'onKeydown($event)',
    '(paste)': 'onPaste($event)',
    '(mouseup)': 'onMouseUp()',
  },
  // prettier-ignore
  template: `<ng-template #cellTpl let-cell><div role="gridcell" [attr.data-mol-id]="'spreadsheet-grid-cell-' + cell.ref" [attr.tabindex]="cell.anchor ? 0 : -1" [attr.aria-selected]="cell.selected ? 'true' : null" [class]="cell.classes" [style]="cell.style" (mousedown)="onCellMouseDown(cell, $event)" (mouseenter)="onCellMouseEnter(cell, $event)" (dblclick)="beginEdit(cell.row, cell.col)">@if (editorAt(cell.row, cell.col); as open) {<input [attr.data-mol-id]="'spreadsheet-grid-editor-' + cell.ref" [class]="plan.editorClasses" [attr.value]="open.draft" (input)="onDraftInput($event)" (blur)="commitEdit()" (keydown)="onEditorKeydown($event)" [attr.aria-label]="cellEditorLabel(cell.ref)" />} @else {<div [class]="plan.contentClasses">@if (renderCellTemplate(); as cellRenderer) {<ng-container [ngTemplateOutlet]="cellRenderer" [ngTemplateOutletContext]="cellContext(cell)"></ng-container>} @else {<ng-container>{{ cell.text }}</ng-container>}</div>}</div></ng-template><div aria-hidden="true" [class]="plan.cornerClasses" [style]="plan.cornerStyle"></div><div role="row" aria-rowindex="1" [class]="plan.headerLaneClasses" [style]="plan.headerLaneStyle">@for (header of plan.frozenHeaderCells; track header.key) {<div role="columnheader" [attr.aria-colindex]="header.index + 1" [class]="header.classes" [style]="header.style">{{ header.text }}</div>}<div [style]="plan.headerScrollerStyle">@for (header of plan.scrollingHeaderCells; track header.key) {<div role="columnheader" [attr.aria-colindex]="header.index + 1" [class]="header.classes" [style]="header.style">{{ header.text }}</div>}</div></div><div aria-hidden="true" [class]="plan.gutterLaneClasses" [style]="plan.gutterLaneStyle">@for (label of plan.frozenGutterCells; track label.key) {<div [class]="label.classes" [style]="label.style">{{ label.text }}</div>}<div [style]="plan.gutterScrollerStyle">@for (label of plan.scrollingGutterCells; track label.key) {<div [class]="label.classes" [style]="label.style">{{ label.text }}</div>}</div></div>@if (plan.showFrozenRows) {<div [style]="plan.frozenRowsRegionStyle"><div [style]="plan.frozenRowsInnerStyle">@for (cell of plan.frozenRowsCells; track cell.ref) {<ng-container [ngTemplateOutlet]="cellTpl" [ngTemplateOutletContext]="{ $implicit: cell }"></ng-container>}</div></div>}@if (plan.showFrozenCols) {<div [style]="plan.frozenColsRegionStyle"><div [style]="plan.frozenColsInnerStyle">@for (cell of plan.frozenColsCells; track cell.ref) {<ng-container [ngTemplateOutlet]="cellTpl" [ngTemplateOutletContext]="{ $implicit: cell }"></ng-container>}</div></div>}@if (plan.showFrozenCorner) {<div [style]="plan.frozenCornerStyle">@for (cell of plan.frozenCornerCells; track cell.ref) {<ng-container [ngTemplateOutlet]="cellTpl" [ngTemplateOutletContext]="{ $implicit: cell }"></ng-container>}</div>}<div data-mol-id="spreadsheet-grid-scroll" [style]="plan.scrollRegionStyle" (scroll)="onScroll($event)"><div [style]="plan.scrollSpacerStyle">@for (cell of plan.mainCells; track cell.ref) {<ng-container [ngTemplateOutlet]="cellTpl" [ngTemplateOutletContext]="{ $implicit: cell }"></ng-container>}</div></div><span [class]="plan.totalClasses" [style]="plan.totalStyle" aria-hidden="true">{{ plan.totalText }}</span>`,
})
export class SpreadsheetGrid implements DoCheck {
  /** Total number of rows in the grid. */
  rows!: number
  /** Total number of columns in the grid. */
  columns!: number
  /** Sparse cell-data map. Cells not present render as empty. */
  cells!: CellMap
  /** Called when the user commits an edit (React's `onCellChange`). */
  onCellChange?: (ref: string, value: CellValue) => void
  /** Current selection. */
  selection!: SpreadsheetSelection
  /** Called when the user changes the selection (React's `onSelectionChange`). */
  onSelectionChange?: (selection: SpreadsheetSelection) => void
  /** Number of rows frozen at the top (default `0` at read time). */
  frozenRows?: number
  /** Number of columns frozen on the left (default `0` at read time). */
  frozenCols?: number
  /** Per-cell width in pixels (default `96` at read time). */
  cellWidth?: number
  /** Per-cell height in pixels (default `28` at read time). */
  cellHeight?: number
  /** Width of the row-number gutter (default `48` at read time). */
  gutterWidth?: number
  /** Height of the column-letter header (default `28` at read time). */
  headerHeight?: number
  /** Visible viewport width in pixels (default `720` at read time). */
  viewportWidth?: number
  /** Visible viewport height in pixels (default `360` at read time). */
  viewportHeight?: number
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
  /** Optional cell renderer (`ng-template`): `$implicit`/`a0` value, `a1` ref. */
  renderCell?: TemplateRef<unknown> | null

  /** The grid's horizontal scroll offset. */
  protected readonly scrollLeft = signal(0)
  /** The grid's vertical scroll offset. */
  protected readonly scrollTop = signal(0)
  /** The open in-cell editor. */
  protected readonly editing = signal<Editing | null>(null)

  /** The component host (the root `<div role="grid">`). */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
  /** The injector `afterNextRender` needs outside a constructor. */
  private readonly injector = inject(Injector)
  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the labels on a locale switch.
   */
  private readonly i18n = useTranslation()

  /** Where the current drag started, while a mouse button is held. */
  private dragAnchor: { row: number; col: number } | null = null
  /** The plan computed for the current change-detection pass. */
  private currentPlan: GridLayout | null = null

  /**
   * The layout plan for the current change-detection pass (recomputed in
   * {@link ngDoCheck}, before the template and host bindings read it).
   *
   * @returns The layout plan.
   */
  protected get plan(): GridLayout {
    if (!this.currentPlan) this.currentPlan = computeLayout(this.geometry(), this.cm())
    return this.currentPlan
  }

  /**
   * Recomputes the plan, then re-applies React's controlled-input value: the
   * live value follows the draft after a re-render (the binding sets the
   * attribute; only a user edit moves the property).
   */
  ngDoCheck(): void {
    this.currentPlan = computeLayout(this.geometry(), this.cm())
    const open = this.editing()
    const field = this.host.nativeElement.querySelector('input')
    if (open && field instanceof HTMLInputElement && field.value !== open.draft)
      field.value = open.draft
  }

  /**
   * The current class map.
   *
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root's accessible label (React's `t('spreadsheetGrid.label', …)`).
   *
   * @returns The translated label.
   */
  label(): string {
    return this.i18n.t('spreadsheetGrid.label', undefined, { defaultValue: 'Spreadsheet' })
  }

  /**
   * The editor field's accessible label (React's `t('spreadsheetGrid.cellEditor', { ref }, …)`).
   *
   * @param ref - The cell's A1 reference.
   * @returns The translated label.
   */
  cellEditorLabel(ref: string): string {
    return this.i18n.t(
      'spreadsheetGrid.cellEditor',
      { ref },
      {
        defaultValue: 'Edit cell {{ref}}',
      },
    )
  }

  /**
   * The editor state of one cell, when that cell is the one being edited.
   *
   * @param row - 0-indexed row.
   * @param col - 0-indexed column.
   * @returns The editor state, or null.
   */
  editorAt(row: number, col: number): Editing | null {
    const current = this.editing()
    return current && current.row === row && current.col === col ? current : null
  }

  /**
   * The `renderCell` template, when the caller supplied one.
   *
   * @returns The template, or null.
   */
  renderCellTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.renderCell) ? this.renderCell : null
  }

  /**
   * The context a `renderCell` template receives (the value as `$implicit`/`a0`,
   * the A1 reference as `a1`).
   *
   * @param cell - The cell.
   * @returns The template context.
   */
  cellContext(cell: GridCell): Record<string, unknown> {
    return { $implicit: cell.value, a0: cell.value, a1: cell.ref, a2: undefined }
  }

  /**
   * The current geometry from the inputs and the grid's own state.
   *
   * @returns The geometry.
   */
  private geometry(): GridGeometry {
    return {
      rows: this.rows,
      columns: this.columns,
      cells: this.cells,
      selection: this.selection,
      frozenRows: this.frozenRows ?? 0,
      frozenCols: this.frozenCols ?? 0,
      cellWidth: this.cellWidth ?? 96,
      cellHeight: this.cellHeight ?? 28,
      gutterWidth: this.gutterWidth ?? 48,
      headerHeight: this.headerHeight ?? 28,
      viewportWidth: this.viewportWidth ?? 720,
      viewportHeight: this.viewportHeight ?? 360,
      scrollLeft: this.scrollLeft(),
      scrollTop: this.scrollTop(),
      editing: this.editing(),
    }
  }

  /**
   * Opens the in-cell editor on one cell, seeding the draft from its value.
   *
   * @param row - 0-indexed row.
   * @param col - 0-indexed column.
   */
  beginEdit(row: number, col: number): void {
    this.editing.set({
      row,
      col,
      draft: formatCellValue(this.cells.get(cellRef(row, col))),
    })
    // React focuses and selects the field in an effect after the editor
    // mounts; there is no field before this render, so focus after the next one.
    afterNextRender(
      () => {
        const field = this.host.nativeElement.querySelector('input')
        if (field instanceof HTMLInputElement) {
          field.focus()
          field.select()
        }
      },
      { injector: this.injector },
    )
  }

  /** Commits the open edit: empty clears the cell, number-like text becomes a number. */
  commitEdit(): void {
    const current = this.editing()
    if (!current) return
    const ref = cellRef(current.row, current.col)
    const trimmed = current.draft
    let next: CellValue
    if (trimmed === '') next = null
    else if (/^-?\d+(\.\d+)?$/.test(trimmed)) next = Number(trimmed)
    else next = trimmed
    this.onCellChange?.(ref, next)
    this.editing.set(null)
  }

  /** Closes the editor without committing. */
  cancelEdit(): void {
    this.editing.set(null)
  }

  /**
   * React's cell `onMouseDown`: commits an open edit, then starts or extends
   * the selection.
   *
   * @param cell - The cell.
   * @param event - The mouse event.
   */
  onCellMouseDown(cell: GridCell, event: MouseEvent): void {
    if (this.editing()) this.commitEdit()
    const selection = this.selection
    if (event.shiftKey) {
      this.onSelectionChange?.({ r1: selection.r1, c1: selection.c1, r2: cell.row, c2: cell.col })
    } else {
      this.dragAnchor = { row: cell.row, col: cell.col }
      this.onSelectionChange?.({ r1: cell.row, c1: cell.col, r2: cell.row, c2: cell.col })
    }
  }

  /**
   * React's cell `onMouseEnter`: extends the selection while the primary
   * button is held.
   *
   * @param cell - The cell.
   * @param event - The mouse event.
   */
  onCellMouseEnter(cell: GridCell, event: MouseEvent): void {
    if (event.buttons !== 1) return
    const anchor = this.dragAnchor
    if (!anchor) return
    this.onSelectionChange?.({ r1: anchor.row, c1: anchor.col, r2: cell.row, c2: cell.col })
  }

  /** Clears the drag anchor on mouse up. */
  onMouseUp(): void {
    this.dragAnchor = null
  }

  /**
   * React's container `onKeyDown`: copy, and Edit on Enter / F2.
   *
   * @param event - The keyboard event.
   */
  onKeydown(event: KeyboardEvent): void {
    const isMod = event.ctrlKey || event.metaKey
    if (this.editing()) return
    if (isMod && event.key.toLowerCase() === 'c') {
      event.preventDefault()
      void this.handleCopy()
      return
    }
    if (isMod && event.key.toLowerCase() === 'v') return
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault()
      this.beginEdit(this.selection.r1, this.selection.c1)
    }
  }

  /**
   * The editor field's key handling: Enter commits, Escape cancels. The grid's
   * own key handler runs only while no editor is open (React reads the state
   * the render before the event began, so a key that commits here never
   * reaches it), so the event stays on the field.
   *
   * @param event - The keyboard event.
   */
  onEditorKeydown(event: KeyboardEvent): void {
    event.stopPropagation()
    if (event.key === 'Enter') {
      event.preventDefault()
      this.commitEdit()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      this.cancelEdit()
    }
  }

  /**
   * React's editor `onChange`: each typed value becomes the draft.
   *
   * @param event - The native input event.
   */
  onDraftInput(event: Event): void {
    const current = this.editing()
    if (!current) return
    this.editing.set({ ...current, draft: (event.target as HTMLInputElement).value })
  }

  /**
   * React's container `onPaste`: intercepts the native paste event.
   *
   * @param event - The clipboard event.
   */
  onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData ? event.clipboardData.getData('text/plain') : ''
    if (!text) return
    event.preventDefault()
    this.handlePaste(text)
  }

  /**
   * The scroller's `scroll` handler: refreshes the rendered window.
   *
   * @param event - The scroll event.
   */
  onScroll(event: Event): void {
    const element = event.currentTarget as HTMLDivElement
    this.scrollLeft.set(element.scrollLeft)
    this.scrollTop.set(element.scrollTop)
  }

  /**
   * Serializes the selection to TSV and copies it through the clipboard bond.
   *
   * @returns The TSV text.
   */
  async handleCopy(): Promise<string> {
    const tsv = serializeSelectionTsv(this.cells, this.selection)
    await copyTextWithFallback(tsv)
    return tsv
  }

  /**
   * Writes pasted TSV into cells starting at the selection anchor.
   *
   * @param text - Clipboard text (typically TSV).
   */
  handlePaste(text: string): void {
    const grid = parseClipboardTsv(text)
    if (grid.length === 0) return
    const n = normalizeSelection(this.selection)
    for (let r = 0; r < grid.length; r += 1) {
      const row = grid[r]!
      for (let c = 0; c < row.length; c += 1) {
        const targetRow = n.r1 + r
        const targetCol = n.c1 + c
        if (targetRow >= this.rows || targetCol >= this.columns) continue
        const raw = row[c]!
        let next: CellValue
        if (raw === '') next = null
        else if (/^-?\d+(\.\d+)?$/.test(raw)) next = Number(raw)
        else next = raw
        this.onCellChange?.(cellRef(targetRow, targetCol), next)
      }
    }
  }
}
