/**
 * Gradebook component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { GpaScale, Grade, GradebookColumn } from './types.js'
import { computePercentage, formatGpa } from './utilities.js'

/** One column header: its `data-mol-id` and its translated label. */
interface HeaderCell {
  /** The header's `data-mol-id`. */
  id: string
  /** The translated label. */
  text: string
}

/**
 * Gradebook component.
 *
 * Unified gradebook table — title, letter grade, numeric score, weight, and
 * contribution-to-GPA — with the em-dash placeholders, the empty state and the
 * per-cell click callback. The host IS React's root element
 * (`div[mol-gradebook]`), matching both of React's branches: the empty state's
 * classes, `data-mol-id` and child, or the table's. Node-valued row fields
 * (`title`, `postedAt`) are projected templates in Angular (an input cannot
 * carry a node), rendered through `ngTemplateOutlet`; plain text renders as
 * text.
 */
@Component({
  selector: 'div[mol-gradebook]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['grades', 'gpaScale', 'onCellClick', 'className'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'molId()',
    role: 'region',
    '[attr.aria-label]': 'regionLabel()',
  },
  // prettier-ignore
  template: `@if (grades.length === 0) {<span [class]="emptyTextClasses()">{{ emptyText() }}</span>} @else {<table [class]="tableClasses()" data-mol-id="gradebook-table"><thead><tr data-mol-id="gradebook-header-row">@for (header of headerCells(); track header.id) {<th scope="col" [class]="headerClasses()" [attr.data-mol-id]="header.id">{{ header.text }}</th>}</tr></thead><tbody>@for (grade of grades; track grade.id) {<tr data-mol-id="gradebook-row" [attr.data-row-id]="grade.id"><td [class]="cellClasses()" data-mol-id="gradebook-cell-title" (click)="cellClick(grade, 'title')">@if (isNode(grade.title)) {<ng-container [ngTemplateOutlet]="asTemplate(grade.title)"></ng-container>} @else {<ng-container>{{ text(grade.title) }}</ng-container>}</td><td [class]="cellClasses()" data-mol-id="gradebook-cell-letter" (click)="cellClick(grade, 'letter')">{{ grade.letter ?? '—' }}</td><td [class]="cellClasses()" data-mol-id="gradebook-cell-numeric" (click)="cellClick(grade, 'numeric')">{{ numericText(grade) }}</td><td [class]="cellClasses()" data-mol-id="gradebook-cell-weight" (click)="cellClick(grade, 'weight')">{{ weightText(grade) }}</td><td [class]="cellClasses()" data-mol-id="gradebook-cell-contribution" (click)="cellClick(grade, 'contribution')">{{ contributionText(grade) }}</td><td [class]="cellClasses()" data-mol-id="gradebook-cell-posted" (click)="cellClick(grade, 'posted')">@if (isNode(grade.postedAt)) {<ng-container [ngTemplateOutlet]="asTemplate(grade.postedAt)"></ng-container>} @else {<ng-container>{{ text(grade.postedAt ?? '—') }}</ng-container>}</td></tr>}</tbody></table>}`,
})
export class Gradebook {
  /** Rows to display (a course or an assignment per row — the caller's choice). */
  grades: Grade[] = []
  /** GPA scale used for numeric rendering of contribution / score columns. */
  gpaScale: GpaScale = '4.0'
  /** Optional cell-click handler — fires with the grade row + the column key clicked. */
  onCellClick?: (grade: Grade, column: GradebookColumn) => void
  /** Extra classes merged onto the root `<table>` wrapper. */
  className?: string

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
   * Whether the empty state renders (React's `grades.length === 0`).
   * @returns True when there are no rows.
   */
  get empty(): boolean {
    return this.grades.length === 0
  }

  /**
   * The host's class list: the empty branch's padding + `className`, or just
   * `className` for the table.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return this.empty ? cm.cn(cm.sp('p', 4), this.className) : cm.cn(this.className)
  }

  /**
   * The host's `data-mol-id`, as React writes it per branch.
   * @returns `gradebook-empty` or `gradebook`.
   */
  molId(): string {
    return this.empty ? 'gradebook-empty' : 'gradebook'
  }

  /**
   * The translated region label (React's `gradebook.aria.region` key).
   * @returns The aria label.
   */
  regionLabel(): string {
    return this.i18n.t('gradebook.aria.region', {}, { defaultValue: 'Gradebook' })
  }

  /**
   * The translated empty-state text (React's `gradebook.empty` key).
   * @returns The empty-state label.
   */
  emptyText(): string {
    return this.i18n.t('gradebook.empty', {}, { defaultValue: 'No grades yet.' })
  }

  /**
   * The empty state's span class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  emptyTextClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The table's class list (`cm.cn(cm.w('full'))`).
   * @returns The class string.
   */
  tableClasses(): string {
    return this.cm().cn(this.cm().w('full'))
  }

  /**
   * A header cell's class list (xs + semibold).
   * @returns The class string.
   */
  headerClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))
  }

  /**
   * A body cell's class list (`cm.cn(cm.textSize('sm'))`).
   * @returns The class string.
   */
  cellClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * The six column headers, in React's order, with the scale-dependent numeric
   * label.
   * @returns The header cells.
   */
  headerCells(): HeaderCell[] {
    const t = this.i18n.t
    return [
      { id: 'gradebook-h-title', text: t('gradebook.col.title', {}, { defaultValue: 'Course' }) },
      { id: 'gradebook-h-letter', text: t('gradebook.col.letter', {}, { defaultValue: 'Letter' }) },
      {
        id: 'gradebook-h-numeric',
        text:
          this.gpaScale === 'percentage'
            ? t('gradebook.col.numericPct', {}, { defaultValue: 'Score (%)' })
            : t('gradebook.col.numeric', {}, { defaultValue: 'Score' }),
      },
      { id: 'gradebook-h-weight', text: t('gradebook.col.weight', {}, { defaultValue: 'Weight' }) },
      {
        id: 'gradebook-h-contribution',
        text: t('gradebook.col.contribution', {}, { defaultValue: 'GPA contribution' }),
      },
      { id: 'gradebook-h-posted', text: t('gradebook.col.posted', {}, { defaultValue: 'Posted' }) },
    ]
  }

  /**
   * Render a numeric percentage / score cell using the configured scale.
   *
   * @param grade - The grade row.
   * @returns The cell text.
   */
  numericText(grade: Grade): string {
    if (this.gpaScale === 'percentage') {
      return `${Math.round(computePercentage(grade))}%`
    }
    if (typeof grade.maxPoints === 'number' && grade.maxPoints > 0) {
      return `${grade.score} / ${grade.maxPoints}`
    }
    return String(grade.score)
  }

  /**
   * The weight cell's text (`25%`, or an em dash when absent).
   *
   * @param grade - The grade row.
   * @returns The cell text.
   */
  weightText(grade: Grade): string {
    return typeof grade.weight === 'number' ? `${Math.round(grade.weight * 100)}%` : '—'
  }

  /**
   * The contribution cell's text, formatted for the active scale.
   *
   * @param grade - The grade row.
   * @returns The cell text.
   */
  contributionText(grade: Grade): string {
    return typeof grade.contribution === 'number'
      ? formatGpa(grade.contribution, this.gpaScale)
      : '—'
  }

  /**
   * Calls the cell-click handler with the row and its column, as React does.
   *
   * @param grade - The grade row.
   * @param column - The column identifier.
   */
  cellClick(grade: Grade, column: GradebookColumn): void {
    this.onCellClick?.(grade, column)
  }

  /**
   * Whether a node-valued field arrived as a projected template.
   * @param value - The field value.
   * @returns True for a template.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * A node-valued field as a template (the `@if` above already checked it).
   * @param value - The field value.
   * @returns The template, or null when it is not one.
   */
  asTemplate(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * A node-valued field as display text.
   * @param value - The field value.
   * @returns Its text, or an empty string when absent.
   */
  text(value: unknown): string {
    return value === null || value === undefined ? '' : String(value)
  }
}
