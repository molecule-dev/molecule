/**
 * AdminTable component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, signal, type TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { asTemplate, nodeText } from '@molecule/app-ui-angular'

import { AdminTableRowActions } from './admin-table-row-actions.component.js'
import { MolAdminChecked } from './checked.js'
import type { AdminTableColumn, AdminTableRowAction } from './types.js'

/**
 * Generic admin-style data table.
 *
 * Solid counterpart of `@molecule/app-admin-table-react`'s `AdminTable` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input. The host IS the outer `<div>` (`div[mol-admin-table]`), carrying
 * React's card classes and `overflow: hidden` style.
 *
 * Column `render` and node-valued `header`/`footer` values arrive as
 * `TemplateRef`s (rendered with `ngTemplateOutlet`); text values render as
 * text. Row selection follows React: `selectedIds` is honored only with
 * `onSelectedIdsChange` (controlled), otherwise selection is internal.
 */
@Component({
  selector: 'div[mol-admin-table]',
  standalone: true,
  imports: [NgTemplateOutlet, MolAdminChecked, AdminTableRowActions],
  inputs: [
    'rows',
    'columns',
    'rowKey',
    'loading',
    'skeletonRowCount',
    'onRowClick',
    'bulkSelect',
    'selectedIds',
    'onSelectedIdsChange',
    'rowActions',
    'rowActionsAriaLabel',
    'footer',
    'className',
    'tbodyDataMolId',
  ],
  host: {
    '[class]': 'classes()',
    '[style.overflow]': "'hidden'",
  },
  // prettier-ignore
  template: `<table [class]="tableClasses()" style="border-collapse: collapse"><thead><tr [class]="headRowClasses()">@if (bulkSelect) {<th [class]="selectHeadClasses()"><span [class]="srOnlyClasses()">{{ selectColumnText() }}</span></th>}@for (column of columns; track column.id) {<th [class]="headerCellClasses(column)">@if (headerTemplate(column); as tpl) {<ng-container [ngTemplateOutlet]="tpl"></ng-container>} @else { {{ headerText(column) }} }</th>}@if (hasActions()) {<th [class]="actionsHeadClasses()"><span [class]="srOnlyClasses()">{{ actionsColumnText() }}</span></th>}</tr></thead><tbody [attr.data-mol-id]="tbodyDataMolId ?? null">@if (loading) {@for (rowIndex of skeletonRows(); track rowIndex) {<tr [class]="skeletonRowClasses()">@for (cellIndex of skeletonCells(); track cellIndex) {<td [class]="skeletonCellClasses()"><div [class]="skeletonBarClasses()"></div></td>}</tr>}} @else {@for (row of rows; track trackKey(row)) {<tr [attr.data-mol-id]="rowDomId(row)" [attr.tabindex]="onRowClick ? 0 : null" (click)="clickRow(row)" (keydown)="keydownRow(row, $event)" [class]="rowClasses()">@if (bulkSelect) {<td [class]="cellPaddingClasses()"><input type="checkbox" mol-admin-checked [molAdminChecked]="isSelected(trackKey(row))" [attr.aria-label]="selectRowLabel()" [attr.data-mol-id]="selectDomId(row)" (click)="toggle(trackKey(row), $event)" [class]="checkboxClasses()" /></td>}@for (column of columns; track column.id) {<td [class]="cellClasses(column)">@if (cellTemplate(column); as tpl) {<ng-container [ngTemplateOutlet]="tpl" [ngTemplateOutletContext]="rowContext(row)"></ng-container>}</td>}@if (hasActions()) {<td [class]="actionsCellClasses()"><div mol-admin-table-row-actions [row]="row" [actions]="rowActions ?? []" [ariaLabel]="ariaLabelFor(row)" [stopActionPropagation]="!!onRowClick"></div></td>}</tr>}}</tbody></table><ng-content select="[slot=footer]"></ng-content>@if (footerTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl"></ng-container>}{{ footerText() }}`,
})
export class AdminTable<T = unknown> {
  /** Rows to render. */
  rows: T[] = []
  /** Column definitions. */
  columns: AdminTableColumn<T>[] = []
  /** Pull a stable key from a row. */
  rowKey?: (row: T) => string
  /** When true, renders skeleton rows instead of the rows. */
  loading?: boolean
  /** Number of skeleton rows while loading (React's default 8). */
  skeletonRowCount?: number
  /** Click handler for whole-row navigation. */
  onRowClick?: (row: T) => void
  /** When set, renders a leading checkbox column and tracks selection. */
  bulkSelect?: boolean
  /** Selected row keys; honored only with `onSelectedIdsChange` (controlled mode). */
  selectedIds?: string[]
  /** Selection-change handler — providing it switches selection to controlled mode. */
  onSelectedIdsChange?: (ids: string[]) => void
  /** Kebab menu items; when set, a trailing right-aligned actions column renders. */
  rowActions?: AdminTableRowAction<T>[]
  /** Per-row accessible label for the actions menu. */
  rowActionsAriaLabel?: (row: T) => string
  /** Footer content: a template (React's node prop) or text. */
  footer?: unknown
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for the rendered `<tbody>`. */
  tbodyDataMolId?: string

  /** The internal (uncontrolled) selection state. */
  private readonly internalSelected = signal<string[]>([])

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper class list (React's `cn(card(), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().card(), this.className)
  }

  /**
   * The table class list (`w-full`).
   * @returns The class string.
   */
  tableClasses(): string {
    return this.cm().cn(this.cm().w('full'))
  }

  /**
   * The header row's class list (`surfaceSecondary` + `textMuted` + `borderB`).
   * @returns The class string.
   */
  headRowClasses(): string {
    return this.cm().cn(this.cm().surfaceSecondary, this.cm().textMuted, this.cm().borderB)
  }

  /**
   * The bulk-select header cell's class list.
   * @returns The class string.
   */
  selectHeadClasses(): string {
    return this.cm().cn(this.cm().sp('py', 3), this.cm().sp('px', 6), this.cm().w(8))
  }

  /**
   * The visually hidden run's class list (`cm.cn(cm.srOnly)`), which carries the
   * accessible names of the columns that have no visible header text.
   * @returns The class string.
   */
  srOnlyClasses(): string {
    return this.cm().cn(this.cm().srOnly)
  }

  /**
   * The checkbox column's accessible name (React's translated
   * `adminTable.aria.selectColumn`). Read from the template, so the binding
   * follows a locale switch the way React's re-render does.
   * @returns The name.
   */
  selectColumnText(): string {
    return this.i18n.t('adminTable.aria.selectColumn', undefined, { defaultValue: 'Select' })
  }

  /**
   * The actions column's accessible name (React's translated
   * `adminTable.aria.actionsColumn`), read from the template like
   * {@link selectColumnText}.
   * @returns The name.
   */
  actionsColumnText(): string {
    return this.i18n.t('adminTable.aria.actionsColumn', undefined, { defaultValue: 'Actions' })
  }

  /**
   * Each row checkbox's accessible name (React's translated
   * `adminTable.aria.selectRow`), read from the template like
   * {@link selectColumnText}.
   * @returns The name.
   */
  selectRowLabel(): string {
    return this.i18n.t('adminTable.aria.selectRow', undefined, { defaultValue: 'Select row' })
  }

  /**
   * One header cell's class list (React's alignment branch plus the column's
   * own classes).
   * @param column - The column.
   * @returns The class string.
   */
  headerCellClasses(column: AdminTableColumn<T>): string {
    return this.cm().cn(
      this.cm().sp('py', 3),
      this.cm().sp('px', 6),
      this.cm().textSize('xs'),
      this.cm().fontWeight('bold'),
      this.cm().uppercase,
      this.cm().trackingWide,
      column.align === 'right'
        ? this.cm().textRight
        : column.align === 'center'
          ? this.cm().textCenter
          : '',
      column.headerClassName,
    )
  }

  /**
   * The actions header cell's class list.
   * @returns The class string.
   */
  actionsHeadClasses(): string {
    return this.cm().cn(
      this.cm().sp('py', 3),
      this.cm().sp('px', 6),
      this.cm().w(12),
      this.cm().textRight,
    )
  }

  /**
   * Whether a trailing actions column renders (`rowActions` non-empty).
   * @returns True when the actions column renders.
   */
  hasActions(): boolean {
    return !!this.rowActions && this.rowActions.length > 0
  }

  /**
   * The skeleton rows' indexes.
   * @returns One index per skeleton row.
   */
  skeletonRows(): number[] {
    return Array.from({ length: this.skeletonRowCount ?? 8 }, (_unused, index) => index)
  }

  /**
   * One cell index per column in a skeleton row.
   * @returns One index per skeleton cell.
   */
  skeletonCells(): number[] {
    return Array.from({
      length: this.columns.length + (this.bulkSelect ? 1 : 0) + (this.hasActions() ? 1 : 0),
    })
  }

  /**
   * A skeleton row's class list (`borderB`).
   * @returns The class string.
   */
  skeletonRowClasses(): string {
    return this.cm().cn(this.cm().borderB)
  }

  /**
   * A skeleton cell's class list.
   * @returns The class string.
   */
  skeletonCellClasses(): string {
    return this.cm().cn(this.cm().sp('py', 4), this.cm().sp('px', 6))
  }

  /**
   * A skeleton bar's class list (`h-4` + `w-24` + the skeleton token).
   * @returns The class string.
   */
  skeletonBarClasses(): string {
    return this.cm().cn(this.cm().h(4), this.cm().w(24), this.cm().skeleton())
  }

  /**
   * A padding-only cell's class list.
   * @returns The class string.
   */
  cellPaddingClasses(): string {
    return this.cm().cn(this.cm().sp('py', 4), this.cm().sp('px', 6))
  }

  /**
   * A body row's class list: React adds `cursor-pointer` and the clickable
   * hover state only when the row is clickable.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().cn(this.cm().tableRow, this.onRowClick ? this.cm().tableRowClickable : '')
  }

  /**
   * One body cell's class list (React's alignment branch plus the column's own
   * classes).
   * @param column - The column.
   * @returns The class string.
   */
  cellClasses(column: AdminTableColumn<T>): string {
    return this.cm().cn(
      this.cm().sp('py', 4),
      this.cm().sp('px', 6),
      column.align === 'right'
        ? this.cm().textRight
        : column.align === 'center'
          ? this.cm().textCenter
          : '',
      column.className,
    )
  }

  /**
   * The actions cell's class list.
   * @returns The class string.
   */
  actionsCellClasses(): string {
    return this.cm().cn(this.cm().sp('py', 4), this.cm().sp('px', 6), this.cm().textRight)
  }

  /**
   * The checkbox's class list (`cm.checkbox()`).
   * @returns The class string.
   */
  checkboxClasses(): string {
    return this.cm().checkbox()
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
   * One row's `data-mol-id`.
   * @param row - The row.
   * @returns The selector value.
   */
  rowDomId(row: T): string {
    return `admin-table-row-${this.trackKey(row)}`
  }

  /**
   * One row checkbox's `data-mol-id`.
   * @param row - The row.
   * @returns The selector value.
   */
  selectDomId(row: T): string {
    return `admin-table-select-${this.trackKey(row)}`
  }

  /**
   * The currently selected ids: the controlled prop when a change handler is
   * given, otherwise the internal state (React's `selected`).
   * @returns The selected ids.
   */
  selected(): string[] {
    return this.onSelectedIdsChange ? (this.selectedIds ?? []) : this.internalSelected()
  }

  /**
   * Whether one row's checkbox is checked.
   * @param id - The row key.
   * @returns True when the row is selected.
   */
  isSelected(id: string): boolean {
    return this.selected().includes(id)
  }

  /**
   * Applies a new selection: reports it in controlled mode, stores it
   * internally otherwise (React's `setSelected`).
   * @param next - The new ids.
   */
  setSelected(next: string[]): void {
    if (this.onSelectedIdsChange) this.onSelectedIdsChange(next)
    else this.internalSelected.set(next)
  }

  /**
   * Toggles one row's checkbox from a click, as React's controlled-input
   * `onChange` does — and, like React, restores the box in controlled mode
   * when the props do not change.
   * @param id - The row key.
   * @param event - The click event.
   */
  toggle(id: string, event: MouseEvent): void {
    event.stopPropagation()
    const input = event.target as HTMLInputElement
    const ids = this.selected()
    this.setSelected(input.checked ? [...ids, id] : ids.filter((value) => value !== id))
    // React restores a controlled input to its props value after the change.
    if (this.onSelectedIdsChange) input.checked = ids.includes(id)
  }

  /**
   * Runs the row's click handler (React's row `onClick`).
   * @param row - The clicked row.
   */
  clickRow(row: T): void {
    this.onRowClick?.(row)
  }

  /**
   * Runs the row's keyboard activation (React's Enter/Space `onKeyDown`). A key
   * pressed inside a row control (the checkbox, the actions trigger) belongs to
   * that control and bubbles here; the row activates only for its own keys.
   * @param row - The row.
   * @param event - The keydown.
   */
  keydownRow(row: T, event: KeyboardEvent): void {
    if (!this.onRowClick) return
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.onRowClick(row)
    }
  }

  /**
   * One column's header template, when the caller passed a node header.
   * @param column - The column.
   * @returns The template, or null for text.
   */
  headerTemplate(column: AdminTableColumn<T>): TemplateRef<unknown> | null {
    return asTemplate(column.header)
  }

  /**
   * One column's header text (React's `{col.header}` for text).
   * @param column - The column.
   * @returns The text, or `''` for a node header.
   */
  headerText(column: AdminTableColumn<T>): string {
    return nodeText(column.header)
  }

  /**
   * One column's cell template.
   * @param column - The column.
   * @returns The template, or null.
   */
  cellTemplate(column: AdminTableColumn<T>): TemplateRef<unknown> | null {
    return asTemplate(column.render)
  }

  /**
   * The template context for one row: the row as `$implicit`/`a0` (React calls
   * `render(row)`).
   * @param row - The row.
   * @returns The template context.
   */
  rowContext(row: T): Record<string, unknown> {
    return { $implicit: row, a0: row, a1: undefined, a2: undefined }
  }

  /**
   * The actions menu's accessible label for one row (React's
   * `rowActionsAriaLabel?.(row)`); without it the row-actions component falls
   * back to the translated default (`adminTable.aria.rowActions`).
   * @param row - The row.
   * @returns The label, or undefined.
   */
  ariaLabelFor(row: T): string | undefined {
    return this.rowActionsAriaLabel?.(row)
  }

  /**
   * The footer's template, when the caller passed a node.
   * @returns The template, or null.
   */
  footerTemplate(): TemplateRef<unknown> | null {
    return asTemplate(this.footer)
  }

  /**
   * The footer's text (React's `{footer}` for text).
   * @returns The text, or `''` for a node footer.
   */
  footerText(): string {
    return typeof this.footer === 'string' || typeof this.footer === 'number'
      ? String(this.footer)
      : ''
  }
}
