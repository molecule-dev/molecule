/**
 * DataTableCard component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type DoCheck,
  type ElementRef,
  inject,
  Renderer2,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { ConditionalElement, hasContent, templateOf, textOf } from './slot-dom.js'
import type { DataTableColumn } from './types.js'

/**
 * DataTableCard component.
 *
 * Drop-in card-shaped data table matching the polished flagship pattern — the
 * Angular counterpart of `@molecule/app-data-table-ui-react`'s
 * `DataTableCard`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input. The host IS the outer `<section>`
 * (`section[mol-data-table-card]`), matching React's root exactly.
 *
 * Renders an optional title row (title + action), then a card-wrapped table
 * with uppercase headers, divided rows, a 5-row loading skeleton and a single
 * spanning empty cell. Rows are keyed by `rowKey(row)` (React's
 * `key={rowKey(row)}`), so a row keeps its DOM node while its key is unchanged.
 *
 * Column `cell` templates receive the row as `$implicit` and `a0`; a column
 * `header` may be text or a `TemplateRef`. Node props (`title`, `titleAction`,
 * `emptyMessage`) may be `[slot=…]` content, a `TemplateRef`, or text.
 */
@Component({
  selector: 'section[mol-data-table-card]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'title',
    'titleAction',
    'columns',
    'rows',
    'rowKey',
    'loading',
    'onRowClick',
    'emptyMessage',
    'className',
    'dataMolId',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<div #headerRow [class]="headerRowClasses()">
      <h3 #titleHeading [class]="titleClasses()">
        {{ titleText() }}<ng-content select="[slot=title]"></ng-content>
        @if (titleTemplate(); as tpl) {
          <ng-container [ngTemplateOutlet]="tpl" />
        }
      </h3>
      <ng-content select="[slot=titleAction]"></ng-content>
      @if (titleActionTemplate(); as tpl) {
        <ng-container [ngTemplateOutlet]="tpl" />
      }
      {{ titleActionText() }}
    </div>
    <div [class]="scrollerClasses()">
      <table [class]="tableClasses()">
        <thead>
          <tr [class]="headClasses()">
            @for (column of columns; track column.key; let index = $index) {
              <th [class]="headerCellClasses(column, index)">
                @if (headerTemplate(column); as tpl) {
                  <ng-container [ngTemplateOutlet]="tpl" />
                } @else {
                  {{ headerText(column) }}
                }
              </th>
            }
          </tr>
        </thead>
        <tbody [class]="bodyClasses()">
          @if (loading) {
            @for (index of skeletonIndexes; track index) {
              <tr aria-hidden="true">
                <td [attr.colspan]="columns.length" [class]="skeletonCellClasses()">
                  <div [class]="skeletonBarClasses()"></div>
                </td>
              </tr>
            }
          } @else if (rows.length === 0) {
            <tr>
              <td [attr.colspan]="columns.length" [class]="emptyCellClasses()">
                <ng-content select="[slot=emptyMessage]"></ng-content>
                @if (emptyTemplate(); as tpl) {
                  <ng-container [ngTemplateOutlet]="tpl" />
                }
                {{ emptyText() }}
              </td>
            </tr>
          } @else {
            @for (row of rows; track trackKey(row)) {
              <tr (click)="clickRow(row)" [class]="rowClasses()">
                @for (column of columns; track column.key; let index = $index) {
                  <td [class]="cellClasses(column, index)">
                    @if (cellTemplate(column); as tpl) {
                      <ng-container
                        [ngTemplateOutlet]="tpl"
                        [ngTemplateOutletContext]="rowContext(row)"
                      />
                    }
                  </td>
                }
              </tr>
            }
          }
        </tbody>
      </table>
    </div>`,
})
export class DataTableCard<T = unknown> implements AfterViewInit, DoCheck {
  /** Optional title above the table chrome (text, a `TemplateRef`, or `[slot=title]` content). */
  title?: unknown
  /** Right-aligned action in the title row (a `TemplateRef` or `[slot=titleAction]` content). */
  titleAction?: unknown
  /** Column definitions. */
  columns: ReadonlyArray<DataTableColumn<T>> = []
  /** Rows to render. */
  rows: ReadonlyArray<T> = []
  /** Pull a stable key from a row (React's `key={rowKey(row)}`). */
  rowKey?: (row: T) => string
  /** When true, renders 5 skeleton rows instead of `rows`. */
  loading?: boolean
  /** Optional click handler per row. */
  onRowClick?: (row: T) => void
  /** Empty-state content (text, a `TemplateRef`, or `[slot=emptyMessage]` content). */
  emptyMessage?: unknown
  /** Extra classes on the outer card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The index list of the five skeleton rows. */
  readonly skeletonIndexes = [0, 1, 2, 3, 4]

  /** The title row wrapper, detached while React renders no title row. */
  @ViewChild('headerRow') private headerRow?: ElementRef<HTMLElement>
  /** The `<h3>`, detached while React renders no title. */
  @ViewChild('titleHeading') private titleHeading?: ElementRef<HTMLElement>

  private readonly renderer = inject(Renderer2)
  private readonly conditional = new ConditionalElement(this.renderer)

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The card's class list (React's `cm.cn(cm.stack(4), cm.dataTableCardShell, className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(4), this.cm().dataTableCardShell, this.className)
  }

  /**
   * The title row's class list (`flex between/center` + `px-8` + `pt-8`).
   * @returns The class string.
   */
  headerRowClasses(): string {
    return this.cm().cn(
      this.cm().flex({ justify: 'between', align: 'center' }),
      this.cm().sp('px', 8),
      this.cm().sp('pt', 8),
    )
  }

  /**
   * The title's class list (`text-xl` + `bold` + the card title token).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xl'),
      this.cm().fontWeight('bold'),
      this.cm().dataTableCardTitle,
    )
  }

  /**
   * The scroller's class list (`overflow-x-auto`).
   * @returns The class string.
   */
  scrollerClasses(): string {
    return this.cm().cn(this.cm().dataTableCardScroller)
  }

  /**
   * The table's class list (`w-full` + the card table token).
   * @returns The class string.
   */
  tableClasses(): string {
    return this.cm().cn(this.cm().w('full'), this.cm().dataTableCardTable)
  }

  /**
   * The header row's class list (the card head token).
   * @returns The class string.
   */
  headClasses(): string {
    return this.cm().cn(this.cm().dataTableCardHead)
  }

  /**
   * One header cell's class list (first column `px-8`, the rest `px-4`, plus
   * the column's own classes).
   * @param column - The column.
   * @param index - The column's index.
   * @returns The class string.
   */
  headerCellClasses(column: DataTableColumn<T>, index: number): string {
    return this.cm().cn(
      index === 0 ? this.cm().sp('px', 8) : this.cm().sp('px', 4),
      this.cm().sp('py', 4),
      this.cm().dataTableCardHeaderCell,
      column.headerClassName,
    )
  }

  /**
   * The body's class list (the card body token).
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(this.cm().dataTableCardBody)
  }

  /**
   * A skeleton cell's class list (`px-8` + `py-5`).
   * @returns The class string.
   */
  skeletonCellClasses(): string {
    return this.cm().cn(this.cm().sp('px', 8), this.cm().sp('py', 5))
  }

  /**
   * A skeleton bar's class list (`h-4` + the skeleton token).
   * @returns The class string.
   */
  skeletonBarClasses(): string {
    return this.cm().cn(this.cm().h(4), this.cm().dataTableCardSkeletonBar)
  }

  /**
   * The empty cell's class list (`px-8 py-12 text-center` + the empty token).
   * @returns The class string.
   */
  emptyCellClasses(): string {
    return this.cm().cn(
      this.cm().sp('px', 8),
      this.cm().sp('py', 12),
      this.cm().textCenter,
      this.cm().dataTableCardEmptyCell,
    )
  }

  /**
   * A body row's class list: React adds `cursor-pointer` only when the row is
   * clickable, then the hover token.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().cn(
      this.onRowClick ? this.cm().cursorPointer : '',
      this.cm().dataTableCardRowHover,
    )
  }

  /**
   * One body cell's class list (first column `px-8`, the rest `px-4`, plus the
   * column's own classes).
   * @param column - The column.
   * @param index - The column's index.
   * @returns The class string.
   */
  cellClasses(column: DataTableColumn<T>, index: number): string {
    return this.cm().cn(
      index === 0 ? this.cm().sp('px', 8) : this.cm().sp('px', 4),
      this.cm().sp('py', 5),
      column.cellClassName,
    )
  }

  /**
   * The title's text (React's `{title}` for a text title).
   * @returns The text, or `''` for a node title.
   */
  titleText(): string {
    return typeof this.title === 'string' || typeof this.title === 'number'
      ? textOf(this.title)
      : ''
  }

  /**
   * The title's template, when the caller passed a node.
   * @returns The template, or null.
   */
  titleTemplate(): TemplateRef<unknown> | null {
    return templateOf(this.title)
  }

  /**
   * The title action's text (React's `{titleAction}` for text).
   * @returns The text, or `''` for a node action.
   */
  titleActionText(): string {
    return typeof this.titleAction === 'string' || typeof this.titleAction === 'number'
      ? textOf(this.titleAction)
      : ''
  }

  /**
   * The title action's template, when the caller passed a node.
   * @returns The template, or null.
   */
  titleActionTemplate(): TemplateRef<unknown> | null {
    return templateOf(this.titleAction)
  }

  /**
   * The empty state's text (React's `{emptyMessage}` for text).
   * @returns The text, or `''` for a node empty state.
   */
  emptyText(): string {
    return typeof this.emptyMessage === 'string' || typeof this.emptyMessage === 'number'
      ? textOf(this.emptyMessage)
      : ''
  }

  /**
   * The empty state's template, when the caller passed a node.
   * @returns The template, or null.
   */
  emptyTemplate(): TemplateRef<unknown> | null {
    return templateOf(this.emptyMessage)
  }

  /**
   * One column's header template, when the caller passed a node.
   * @param column - The column.
   * @returns The template, or null for a text header.
   */
  headerTemplate(column: DataTableColumn<T>): TemplateRef<unknown> | null {
    return templateOf(column.header)
  }

  /**
   * One column's header text (React's `{col.header}` for a text header).
   * @param column - The column.
   * @returns The text, or `''` for a node header.
   */
  headerText(column: DataTableColumn<T>): string {
    return typeof column.header === 'string' || typeof column.header === 'number'
      ? textOf(column.header)
      : ''
  }

  /**
   * One column's cell template.
   * @param column - The column.
   * @returns The template, or null.
   */
  cellTemplate(column: DataTableColumn<T>): TemplateRef<unknown> | null {
    return templateOf(column.cell)
  }

  /**
   * The template context for one row: the row as `$implicit` and `a0`
   * (React calls `cell(row)`).
   * @param row - The row.
   * @returns The template context.
   */
  rowContext(row: T): Record<string, unknown> {
    return { $implicit: row, a0: row, a1: undefined }
  }

  /**
   * The key a row is tracked by (React's `key={rowKey(row)}`).
   * @param row - The row.
   * @returns The row's key.
   */
  trackKey(row: T): string {
    return this.rowKey ? this.rowKey(row) : ''
  }

  /**
   * Runs the row's click handler the way React's `onClick` does.
   * @param row - The clicked row.
   */
  clickRow(row: T): void {
    this.onRowClick?.(row)
  }

  /** Reconciles the title row once the view (and its projected content) exists. */
  ngAfterViewInit(): void {
    this.syncVisibility()
  }

  /** Re-reconciles the title row after input writes. */
  ngDoCheck(): void {
    this.syncVisibility()
  }

  /**
   * Keeps the title row and the `<h3>` in the DOM exactly while React renders
   * them: the row when a title or a title action exists, the heading when a
   * title exists.
   */
  private syncVisibility(): void {
    const heading = this.titleHeading?.nativeElement
    const titleShown = this.title !== undefined || hasContent(heading)
    this.conditional.sync(this.headerRow?.nativeElement, titleShown || this.hasTitleAction())
    this.conditional.sync(heading, titleShown)
  }

  /**
   * Whether React renders a title action: the prop, or `[slot=titleAction]`
   * content beside the heading.
   * @returns True when an action renders.
   */
  private hasTitleAction(): boolean {
    if (this.titleAction !== undefined) return true
    const row = this.headerRow?.nativeElement
    if (!row) return false
    const heading = this.titleHeading?.nativeElement
    return Array.from(row.childNodes).some(
      (node) =>
        node !== heading &&
        (node.nodeType === Node.ELEMENT_NODE ||
          (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '')),
    )
  }
}
