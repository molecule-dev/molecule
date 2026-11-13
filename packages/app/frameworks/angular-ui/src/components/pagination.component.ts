/**
 * Pagination component (React parity).
 *
 * @module
 */

import { Component, EventEmitter, Output } from '@angular/core'

import { t } from '@molecule/app-i18n'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ResolvedIcon } from '../utilities/render-icon.js'
import { MolIconSvg, resolveIcon } from '../utilities/render-icon.js'
import { styleText } from '../utilities/style.js'

/** Pagination labels (React's `PaginationProps['labels']`). */
interface PaginationLabels {
  /** Accessible label for the whole navigation. */
  nav?: string
  /** Accessible label for the first-page button. */
  first?: string
  /** Accessible label for the previous-page button. */
  previous?: string
  /** Accessible label for the next-page button. */
  next?: string
  /** Accessible label for the last-page button. */
  last?: string
  /** Accessible label for a numbered page button. */
  goToPage?: (page: number) => string
}

/**
 * Generates the pagination range with ellipsis markers (React's
 * `generatePaginationRange`).
 *
 * @param currentPage - The active page.
 * @param totalPages - The total number of pages.
 * @param siblings - Sibling pages around the active page.
 * @param boundaries - Boundary pages at the start and end.
 * @returns Page numbers and `'ellipsis'` markers.
 */
function generatePaginationRange(
  currentPage: number,
  totalPages: number,
  siblings: number,
  boundaries: number,
): (number | 'ellipsis')[] {
  const range: (number | 'ellipsis')[] = []
  for (let i = 1; i <= Math.min(boundaries, totalPages); i++) range.push(i)
  const siblingStart = Math.max(boundaries + 1, currentPage - siblings)
  const siblingEnd = Math.min(totalPages - boundaries, currentPage + siblings)
  if (siblingStart > boundaries + 1) range.push('ellipsis')
  for (let i = siblingStart; i <= siblingEnd; i++) if (!range.includes(i)) range.push(i)
  if (siblingEnd < totalPages - boundaries) range.push('ellipsis')
  for (let i = Math.max(totalPages - boundaries + 1, boundaries + 1); i <= totalPages; i++) {
    if (!range.includes(i)) range.push(i)
  }
  return range
}

/**
 * Pagination component.
 *
 * The host is the `<nav>` (`nav[mol-pagination]`), exactly React's root.
 */
@Component({
  selector: 'nav[mol-pagination]',
  standalone: true,
  imports: [MolIconSvg],
  inputs: [
    'page',
    'totalPages',
    'siblings',
    'boundaries',
    'size',
    'showFirstLast',
    'showPrevNext',
    'labels',
    'className',
    'style',
    'testId',
    'disabled',
  ],
  outputs: ['change'],
  host: {
    role: 'navigation',
    '[attr.aria-label]': 'navLabel()',
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: `<ul [class]="cm().paginationContent">
    @if (showFirstLast) {
      <li>
        <button
          type="button"
          [class]="buttonClasses(false)"
          (click)="handlePageChange(1)"
          [disabled]="page === 1 || !!disabled"
          [attr.aria-label]="firstLabel()"
        >
          <svg mol-icon [data]="icon('chevrons-left')" />
        </button>
      </li>
    }
    @if (showPrevNext) {
      <li>
        <button
          type="button"
          [class]="buttonClasses(false)"
          (click)="handlePageChange(page - 1)"
          [disabled]="page === 1 || !!disabled"
          [attr.aria-label]="previousLabel()"
        >
          <svg mol-icon [data]="icon('chevron-left')" />
        </button>
      </li>
    }
    @for (item of range(); track $index) {
      @if (item === 'ellipsis') {
        <li>
          <span [class]="cm().paginationEllipsis" aria-hidden="true"
            ><svg mol-icon [data]="icon('ellipsis-horizontal')"
          /></span>
        </li>
      } @else {
        <li>
          <button
            type="button"
            [class]="buttonClasses(item === page)"
            (click)="handlePageChange(item)"
            [disabled]="!!disabled"
            [attr.aria-label]="pageLabel(item)"
            [attr.aria-current]="item === page ? 'page' : null"
          >
            {{ item }}
          </button>
        </li>
      }
    }
    @if (showPrevNext) {
      <li>
        <button
          type="button"
          [class]="buttonClasses(false)"
          (click)="handlePageChange(page + 1)"
          [disabled]="page === totalPages || !!disabled"
          [attr.aria-label]="nextLabel()"
        >
          <svg mol-icon [data]="icon('chevron-right')" />
        </button>
      </li>
    }
    @if (showFirstLast) {
      <li>
        <button
          type="button"
          [class]="buttonClasses(false)"
          (click)="handlePageChange(totalPages)"
          [disabled]="page === totalPages || !!disabled"
          [attr.aria-label]="lastLabel()"
        >
          <svg mol-icon [data]="icon('chevrons-right')" />
        </button>
      </li>
    }
  </ul>`,
})
export class Pagination {
  /** The active page. */
  page = 1
  /** The total number of pages. */
  totalPages = 1
  /** Sibling pages around the active page (default 1). */
  siblings = 1
  /** Boundary pages at the start and end (default 1). */
  boundaries = 1
  /** Button size. */
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md'
  /** Whether the first/last buttons render. */
  showFirstLast = false
  /** Whether the previous/next buttons render (default true). */
  showPrevNext = true
  /** Accessible labels. */
  labels?: PaginationLabels
  /** Extra classes for the nav. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** Disables every button. */
  disabled?: boolean

  /** Fires with the requested page (React's `onChange`). */
  @Output() readonly change = new EventEmitter<number>()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().paginationRoot, this.className)
  }

  /**
   * Serializes the root's inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * The generated page range.
   * @returns The range.
   */
  range(): (number | 'ellipsis')[] {
    return generatePaginationRange(this.page, this.totalPages, this.siblings, this.boundaries)
  }

  /**
   * A pagination button's class list.
   * @param isActive - Whether it is the active page.
   * @returns The class string.
   */
  buttonClasses(isActive: boolean): string {
    return this.cm().cn(
      this.cm().pagination({ active: isActive, size: this.size }),
      this.cm().paginationInteractive,
    )
  }

  /**
   * A button glyph.
   * @param name - The icon name.
   * @returns The resolved icon.
   */
  icon(
    name:
      'chevrons-left' | 'chevron-left' | 'chevron-right' | 'chevrons-right' | 'ellipsis-horizontal',
  ): ResolvedIcon {
    return resolveIcon(name, this.cm().iconSm)
  }

  /**
   * The nav's accessible label.
   * @returns The label.
   */
  navLabel(): string {
    return this.labels?.nav ?? t('ui.pagination.nav', undefined, { defaultValue: 'Pagination' })
  }

  /**
   * The first-page button's accessible label.
   * @returns The label.
   */
  firstLabel(): string {
    return (
      this.labels?.first ??
      t('ui.pagination.first', undefined, { defaultValue: 'Go to first page' })
    )
  }

  /**
   * The previous-page button's accessible label.
   * @returns The label.
   */
  previousLabel(): string {
    return (
      this.labels?.previous ??
      t('ui.pagination.previous', undefined, { defaultValue: 'Go to previous page' })
    )
  }

  /**
   * The next-page button's accessible label.
   * @returns The label.
   */
  nextLabel(): string {
    return (
      this.labels?.next ?? t('ui.pagination.next', undefined, { defaultValue: 'Go to next page' })
    )
  }

  /**
   * The last-page button's accessible label.
   * @returns The label.
   */
  lastLabel(): string {
    return (
      this.labels?.last ?? t('ui.pagination.last', undefined, { defaultValue: 'Go to last page' })
    )
  }

  /**
   * A numbered page button's accessible label (a custom `labels.goToPage`
   * wins, then the localized default).
   *
   * @param item - The page number.
   * @returns The label.
   */
  pageLabel(item: number): string {
    const custom = this.labels?.goToPage?.(item)
    if (custom !== undefined && custom !== null) return custom
    return t('ui.pagination.goToPage', { page: item }, { defaultValue: 'Go to page {{page}}' })
  }

  /**
   * Requests a page change (React's `handlePageChange`).
   * @param newPage - The requested page.
   */
  handlePageChange(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages && newPage !== this.page && !this.disabled) {
      this.change.emit(newPage)
    }
  }
}
