/**
 * Table component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { TableColumn, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ResolvedIcon } from '../utilities/render-icon.js'
import { MolIconSvg, resolveIcon } from '../utilities/render-icon.js'
import { styleText } from '../utilities/style.js'
import { hasNodes, SlotWrapper } from './button.component.js'
import { Spinner } from './spinner.component.js'
import { MolTemplateOutlet } from './template-outlet.directive.js'

/**
 * Table component.
 *
 * The host is the wrapper `<div>` (`div[mol-table]`), exactly React's root;
 * the `<table>` carries the className/style/testId/rest. Column render
 * functions are templates (with `a0`–`a2` = the render function's arguments)
 * or plain functions returning text.
 */
@Component({
  selector: 'div[mol-table]',
  standalone: true,
  imports: [MolIconSvg, MolTemplateOutlet, Spinner],
  inputs: [
    'data',
    'columns',
    'rowKey',
    'bordered',
    'striped',
    'hoverable',
    'size',
    'emptyContent',
    'loading',
    'sort',
    'onSort',
    'onRowClick',
    'className',
    'style',
    'testId',
  ],
  host: {
    '[class]': 'cm().tableWrapper',
  },
  template: `<span #emptySlot><ng-content select="[slot=emptyContent]"></ng-content></span>
    @if (loading) {
      <div [class]="cm().tableLoadingOverlay"><div mol-spinner [size]="'lg'"></div></div>
    }
    <table #tableEl [class]="tableClasses()" [style]="tableStyle()" [attr.data-testid]="testId">
      <thead [class]="cm().tableHeader">
        <tr [class]="cm().tableRow">
          @for (column of columns; track column.key) {
            <th
              [class]="headClasses(column)"
              [style]="columnStyle(column)"
              (click)="handleSort(column)"
              [attr.aria-sort]="ariaSort(column)"
            >
              <div [class]="cm().tableSortWrapper">
                @if (asTemplate(column.header); as headerTpl) {
                  <ng-container [molTemplateOutlet]="headerTpl"></ng-container>
                } @else {
                  {{ nodeText(column.header) }}
                }
                @if (column.sortable && sort?.key === column.key) {
                  <span [class]="cm().tableSortIcon"><svg mol-icon [data]="sortIcon()" /></span>
                }
              </div>
            </th>
          }
        </tr>
      </thead>
      <tbody [class]="cm().tableBody">
        @if (data.length === 0) {
          <tr>
            <td [attr.colspan]="columns.length" [class]="cm().tableEmptyCell" #emptyCell>
              @if (!hasEmpty()) {
                {{ emptyText() }}
              }
            </td>
          </tr>
        } @else {
          @for (row of data; track rowIndex($index); let rowIdx = $index) {
            <tr [class]="rowClasses($index)" (click)="handleRowClick(row, $index)">
              @for (column of columns; track column.key) {
                <td [class]="cellClasses(column)">
                  @if (column.render) {
                    @if (asTemplate(column.render); as cellTpl) {
                      <ng-container
                        [molTemplateOutlet]="cellTpl"
                        [molTemplateOutletContext]="cellContext(row, column, rowIdx)"
                      ></ng-container>
                    } @else {
                      {{ renderText(row, column, $index) }}
                    }
                  } @else {
                    {{ cellText(row, column) }}
                  }
                </td>
              }
            </tr>
          }
        }
      </tbody>
    </table>`,
})
export class Table implements AfterViewInit, DoCheck {
  /** The rows. */
  data: Record<string, unknown>[] = []
  /** The columns. */
  columns: TableColumn<Record<string, unknown>>[] = []
  /** Row key: a field name or a function. */
  rowKey?: string | ((row: Record<string, unknown>) => string | number)
  /** Renders cell borders. */
  bordered?: boolean
  /** Stripes alternate rows. */
  striped?: boolean
  /** Highlights rows on hover (default true). */
  hoverable = true
  /** Accepted for prop parity; the table has no size variants. */
  size?: string
  /** Content shown when there are no rows (node-valued prop). */
  emptyContent?: unknown
  /** Shows the loading overlay. */
  loading?: boolean
  /** The current sort. */
  sort?: { key: string; direction: 'asc' | 'desc' }
  /** Called with the column key and the next direction (React's `onSort`). */
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  /** Called with the row and index when a row is clicked (React's `onRowClick`). */
  onRowClick?: (row: Record<string, unknown>, index: number) => void
  /** Extra classes for the table. */
  className?: string
  /** Inline style object for the table (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` for the table. */
  testId?: string

  /** The empty-state slot capture point. */
  @ViewChild('emptySlot') emptySlot?: ElementRef<HTMLSpanElement>
  /** The empty-state cell. */
  @ViewChild('emptyCell') emptyCell?: ElementRef<HTMLTableCellElement>

  /** Whether the projected empty content is present (read after view init). */
  readonly hasEmpty = signal(false)

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch (the static `t`
   * does not).
   */
  private readonly i18n = useTranslation()

  private readonly renderer = inject(Renderer2)
  private readonly sync = new SlotWrapper(this.host, this.renderer)
  private emptyParent: HTMLElement | null = null
  private adoptedEmpty: Node[] = []

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The table class list.
   * @returns The class string.
   */
  tableClasses(): string {
    return this.cm().cn(this.cm().table, this.bordered && this.cm().tableBordered, this.className)
  }

  /**
   * Serializes the table's inline style.
   * @returns The style attribute text.
   */
  tableStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * The `<th>` class list.
   * @param column - The column.
   * @returns The class string.
   */
  headClasses(column: TableColumn<Record<string, unknown>>): string {
    return this.cm().cn(
      this.cm().tableHead,
      column.align === 'center' && this.cm().textCenter,
      column.align === 'right' && this.cm().textRight,
      column.sortable && this.cm().tableHeadSortable,
    )
  }

  /**
   * The `<th>` inline style (the column width).
   * @param column - The column.
   * @returns The style attribute text.
   */
  columnStyle(column: TableColumn<Record<string, unknown>>): string | null {
    return styleText({ width: column.width })
  }

  /**
   * The `<td>` class list.
   * @param column - The column.
   * @returns The class string.
   */
  cellClasses(column: TableColumn<Record<string, unknown>>): string {
    return this.cm().cn(
      this.cm().tableCell,
      column.align === 'center' && this.cm().textCenter,
      column.align === 'right' && this.cm().textRight,
    )
  }

  /**
   * The row class list.
   * @param index - The row index.
   * @returns The class string.
   */
  rowClasses(index: number): string {
    return this.cm().cn(
      this.cm().tableRow,
      this.striped && index % 2 === 1 && this.cm().tableRowStriped,
      this.hoverable && this.cm().tableRowHoverable,
      !!this.onRowClick && this.cm().tableRowClickable,
    )
  }

  /**
   * The `aria-sort` value for a column.
   * @param column - The column.
   * @returns The attribute value, or null.
   */
  ariaSort(column: TableColumn<Record<string, unknown>>): string | null {
    if (!column.sortable) return null
    if (this.sort?.key !== column.key) return 'none'
    return this.sort.direction === 'asc' ? 'ascending' : 'descending'
  }

  /**
   * The active sort glyph.
   * @returns The resolved icon.
   */
  sortIcon(): ResolvedIcon {
    return resolveIcon(
      this.sort?.direction === 'asc' ? 'chevron-up' : 'chevron-down',
      this.cm().iconSm,
    )
  }

  /**
   * The default empty-state text.
   * @returns The localized text.
   */
  emptyText(): string {
    return this.i18n.t('ui.table.empty', undefined, { defaultValue: 'No data available' })
  }

  /**
   * A plain-string node value's text.
   * @param value - The prop value.
   * @returns The text, or empty.
   */
  nodeText(value: unknown): string {
    return typeof value === 'string' ? value : ''
  }

  /**
   * Narrows a node-valued prop to a TemplateRef.
   * @param value - The prop value.
   * @returns The template, or null.
   */
  asTemplate(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The stable key for a row (React's `getRowKey`).
   * @param index - The row index.
   * @returns The key.
   */
  rowIndex(index: number): string | number {
    const row = this.data[index]
    if (typeof this.rowKey === 'function') return this.rowKey(row)
    if (this.rowKey && row[this.rowKey] !== undefined) return row[this.rowKey] as string | number
    return index
  }

  /**
   * The context a cell render template receives (the render function's
   * arguments: value, row, index).
   * @param row - The row.
   * @param column - The column.
   * @param index - The row index.
   * @returns The template context.
   */
  cellContext(
    row: Record<string, unknown>,
    column: TableColumn<Record<string, unknown>>,
    index: number,
  ): Record<string, unknown> {
    const value = row[column.key as string]
    return { $implicit: value, a0: value, a1: row, a2: index }
  }

  /**
   * A cell render function's text result (a `format` render returns a string).
   * @param row - The row.
   * @param column - The column.
   * @param index - The row index.
   * @returns The rendered text.
   */
  renderText(
    row: Record<string, unknown>,
    column: TableColumn<Record<string, unknown>>,
    index: number,
  ): string {
    const render = column.render as unknown
    if (typeof render !== 'function') return ''
    const value = row[column.key as string]
    const result = (render as (v: unknown, r: unknown, i: number) => unknown)(value, row, index)
    return typeof result === 'string' ? result : ''
  }

  /**
   * A plain cell's text.
   * @param row - The row.
   * @param column - The column.
   * @returns The cell text.
   */
  cellText(row: Record<string, unknown>, column: TableColumn<Record<string, unknown>>): string {
    const value = row[column.key as string]
    return value === undefined || value === null ? '' : String(value)
  }

  /**
   * Sorts by a column (React's `handleSort`).
   * @param column - The clicked column.
   */
  handleSort(column: TableColumn<Record<string, unknown>>): void {
    if (!column.sortable || !this.onSort) return
    const key = column.key as string
    const currentDirection = this.sort?.key === key ? this.sort.direction : undefined
    this.onSort(key, currentDirection === 'asc' ? 'desc' : 'asc')
  }

  /**
   * Calls the row-click callback (React's `onRowClick`).
   * @param row - The clicked row.
   * @param index - The row index.
   */
  handleRowClick(row: Record<string, unknown>, index: number): void {
    this.onRowClick?.(row, index)
  }

  /**
   * Reads the empty-slot presence at view init (view queries resolve only
   * then) and adopts the projected empty content into the empty cell.
   */
  ngAfterViewInit(): void {
    const slot = this.emptySlot?.nativeElement
    this.emptyParent = slot?.parentElement ?? null
    const present = hasNodes(slot)
    this.hasEmpty.set(present)
    const cell = this.emptyCell?.nativeElement
    if (slot && cell && present) {
      this.adoptedEmpty = Array.from(slot.childNodes)
      for (const node of this.adoptedEmpty) cell.appendChild(node)
    }
    this.sync.sync(slot, false, this.emptyParent ?? undefined)
  }

  /**
   * Re-reconciles the empty content (the empty cell is re-created when the
   * data length changes).
   */
  ngDoCheck(): void {
    const cell = this.emptyCell?.nativeElement
    if (!cell || !this.hasEmpty()) return
    if (this.adoptedEmpty.some((node) => node.parentNode !== cell)) {
      for (const node of this.adoptedEmpty) cell.appendChild(node)
    }
  }
}
