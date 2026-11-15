/**
 * PaginationBar component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'
import { Button, Select } from '@molecule/app-ui-angular'

/**
 * Builds the visible page-number window (with ellipsis sentinels) for the given page and total.
 *
 * @param page - The current page (1-indexed).
 * @param totalPages - The total page count.
 * @returns The page numbers and `'...'` sentinels to render.
 */
function buildWindow(page: number, totalPages: number): (number | '...')[] {
  const out: (number | '...')[] = []
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) out.push(i)
    return out
  }
  out.push(1)
  if (page > 3) out.push('...')
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) out.push(i)
  if (page < totalPages - 2) out.push('...')
  if (totalPages > 1) out.push(totalPages)
  return out
}

/**
 * PaginationBar component.
 *
 * Paginator with a `[showing text, prev, page-window, next, size-select]`
 * layout. The host IS the outer `<div>` (`div[mol-pagination-bar]`), matching
 * React's root exactly. The "Showing X to Y of Z items" text is driven by an
 * i18n key so apps can specialize the noun ("tags", "orders", "transactions").
 * The page-size selector is hidden unless `pageSizeOptions` + `onPageSizeChange`
 * are supplied.
 *
 * This is the Angular counterpart of `@molecule/app-pagination-bar-react`: the
 * same props (React names) and the same DOM for the same input.
 */
@Component({
  selector: 'div[mol-pagination-bar]',
  standalone: true,
  imports: [Button, Select],
  inputs: [
    'page',
    'totalPages',
    'pageSize',
    'total',
    'onPageChange',
    'onPageSizeChange',
    'pageSizeOptions',
    'showingKey',
    'showingDefault',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  template: `<p [class]="cm().textSize('sm')">{{ summary() }}</p>
    <div [class]="cm().flex({ align: 'center', gap: 'xs' })">
      <button
        mol-button
        [variant]="'ghost'"
        [size]="'sm'"
        [disabled]="page === 1"
        [attr.aria-label]="previousLabel()"
        (click)="previous()"
      >
        ‹
      </button>
      @for (entry of pageWindow(); track $index) {
        @if (entry === '...') {
          <span [class]="cm().sp('px', 2)">…</span>
        } @else {
          <button
            mol-button
            [variant]="entry === page ? 'solid' : 'ghost'"
            [color]="'primary'"
            [size]="'sm'"
            [attr.aria-current]="entry === page ? 'page' : null"
            (click)="goTo(entry)"
          >
            {{ entry }}
          </button>
        }
      }
      <button
        mol-button
        [variant]="'ghost'"
        [size]="'sm'"
        [disabled]="page === totalPages"
        [attr.aria-label]="nextLabel()"
        (click)="next()"
      >
        ›
      </button>
    </div>
    @if (pageSizeOptions && onPageSizeChange) {
      <div
        mol-select
        [options]="selectOptions()"
        [value]="pageSizeText()"
        [attr.aria-label]="pageSizeLabel()"
        (valueChange)="changeSize($event)"
      ></div>
    }`,
})
export class PaginationBar {
  /** Current page (1-indexed). */
  page = 1
  /** Total page count (>= 1). */
  totalPages = 1
  /** Items per page. */
  pageSize = 10
  /** Total item count across all pages. */
  total = 0
  /** Called when the user changes page. */
  onPageChange?: (page: number) => void
  /** Called when the user changes page-size (when allowed via `pageSizeOptions`). */
  onPageSizeChange?: (size: number) => void
  /** Available page-size options. When omitted, the size selector is hidden. */
  pageSizeOptions?: number[]
  /** i18n key for the showing text — takes interpolation vars `start`, `end`, `total`. */
  showingKey?: string
  /** Default English fallback for the showing text. */
  showingDefault?: string
  /** Extra classes on the outer wrapper. */
  className?: string

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' }),
      this.className,
    )
  }

  /**
   * The visible page-number window.
   * @returns The page numbers and `'...'` sentinels.
   */
  pageWindow(): (number | '...')[] {
    return buildWindow(this.page, this.totalPages)
  }

  /**
   * The translated "Showing X to Y of Z items" text.
   * @returns The text.
   */
  summary(): string {
    const start = this.total === 0 ? 0 : (this.page - 1) * this.pageSize + 1
    const end = Math.min(this.page * this.pageSize, this.total)
    return this.i18n.t(
      this.showingKey ?? 'pagination.showing',
      { start, end, total: this.total.toLocaleString() },
      { defaultValue: this.showingDefault ?? 'Showing {{start}} to {{end}} of {{total}} items' },
    )
  }

  /**
   * The Previous button's accessible label.
   * @returns The translated label.
   */
  previousLabel(): string {
    return this.i18n.t('pagination.previous', {}, { defaultValue: 'Previous page' })
  }

  /**
   * The Next button's accessible label.
   * @returns The translated label.
   */
  nextLabel(): string {
    return this.i18n.t('pagination.next', {}, { defaultValue: 'Next page' })
  }

  /**
   * The page-size selector's accessible label.
   * @returns The translated label.
   */
  pageSizeLabel(): string {
    return this.i18n.t('pagination.pageSize', {}, { defaultValue: 'Page size' })
  }

  /**
   * The current page size as the select's string value.
   * @returns The value.
   */
  pageSizeText(): string {
    return String(this.pageSize)
  }

  /**
   * The option entries for the page-size selector.
   * @returns One `{ value, label }` per configured page size.
   */
  selectOptions(): { value: string; label: string }[] {
    return (this.pageSizeOptions ?? []).map((n) => ({ value: String(n), label: String(n) }))
  }

  /**
   * Moves to the previous page (never below 1).
   */
  previous(): void {
    this.onPageChange?.(Math.max(1, this.page - 1))
  }

  /**
   * Moves to the next page (never past the last).
   */
  next(): void {
    this.onPageChange?.(Math.min(this.totalPages, this.page + 1))
  }

  /**
   * Moves to a page-number entry, ignoring the ellipsis sentinel.
   *
   * @param page - A page number, or `'...'`.
   */
  goTo(page: number | '...'): void {
    if (typeof page === 'number') this.onPageChange?.(page)
  }

  /**
   * Passes the selected page size on as a number, never `NaN`.
   *
   * @param value - The selected option's value.
   */
  changeSize(value: string): void {
    this.onPageSizeChange?.(Number(value))
  }
}
