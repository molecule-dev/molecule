/**
 * Pagination component.
 *
 * @module
 */

import React, { forwardRef, useMemo } from 'react'

import { t } from '@molecule/app-i18n'
import type { PaginationProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Generate pagination range with ellipsis.
 * @param currentPage - The currently active page number.
 * @param totalPages - The total number of pages.
 * @param siblings - The number of sibling pages to show around the current page.
 * @param boundaries - The number of boundary pages to always show at start and end.
 * @returns An array of page numbers and ellipsis markers.
 */
function generatePaginationRange(
  currentPage: number,
  totalPages: number,
  siblings: number,
  boundaries: number,
): (number | 'ellipsis')[] {
  const range: (number | 'ellipsis')[] = []

  // Always show first boundary pages
  for (let i = 1; i <= Math.min(boundaries, totalPages); i++) {
    range.push(i)
  }

  // Calculate sibling range
  const siblingStart = Math.max(boundaries + 1, currentPage - siblings)
  const siblingEnd = Math.min(totalPages - boundaries, currentPage + siblings)

  // Add ellipsis after boundary if needed
  if (siblingStart > boundaries + 1) {
    range.push('ellipsis')
  }

  // Add sibling pages
  for (let i = siblingStart; i <= siblingEnd; i++) {
    if (!range.includes(i)) {
      range.push(i)
    }
  }

  // Add ellipsis before end boundary if needed
  if (siblingEnd < totalPages - boundaries) {
    range.push('ellipsis')
  }

  // Always show last boundary pages
  for (let i = Math.max(totalPages - boundaries + 1, boundaries + 1); i <= totalPages; i++) {
    if (!range.includes(i)) {
      range.push(i)
    }
  }

  return range
}

/**
 * Ellipsis indicator.
 * @returns The ellipsis JSX element.
 */
const Ellipsis = (): React.JSX.Element => {
  const cm = getClassMap()
  return (
    <span className={cm.paginationEllipsis} aria-hidden="true">
      {renderIcon('ellipsis-horizontal', cm.iconSm)}
    </span>
  )
}

/**
 * Pagination component.
 */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(
  (
    {
      page,
      totalPages,
      onChange,
      siblings = 1,
      boundaries = 1,
      size = 'md',
      showFirstLast = false,
      showPrevNext = true,
      labels,
      className,
      style,
      testId,
      disabled,
    },
    ref,
  ) => {
    const cm = getClassMap()

    const range = useMemo(
      () => generatePaginationRange(page, totalPages, siblings, boundaries),
      [page, totalPages, siblings, boundaries],
    )

    const handlePageChange = (newPage: number): void => {
      if (newPage >= 1 && newPage <= totalPages && newPage !== page && !disabled) {
        onChange(newPage)
      }
    }

    const buttonClasses = (isActive: boolean): string =>
      cm.cn(cm.pagination({ active: isActive, size }), cm.paginationInteractive)

    return (
      <nav
        ref={ref}
        role="navigation"
        aria-label={
          labels?.nav ?? t('ui.pagination.nav', undefined, { defaultValue: 'Pagination' })
        }
        className={cm.cn(cm.paginationRoot, className)}
        style={style}
        data-testid={testId}
      >
        <ul className={cm.paginationContent}>
          {/* First page button */}
          {showFirstLast && (
            <li>
              <button
                type="button"
                className={buttonClasses(false)}
                onClick={() => handlePageChange(1)}
                disabled={page === 1 || disabled}
                aria-label={
                  labels?.first ??
                  t('ui.pagination.first', undefined, { defaultValue: 'Go to first page' })
                }
              >
                {renderIcon('chevrons-left', cm.iconSm)}
              </button>
            </li>
          )}

          {/* Previous page button */}
          {showPrevNext && (
            <li>
              <button
                type="button"
                className={buttonClasses(false)}
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || disabled}
                aria-label={
                  labels?.previous ??
                  t('ui.pagination.previous', undefined, { defaultValue: 'Go to previous page' })
                }
              >
                {renderIcon('chevron-left', cm.iconSm)}
              </button>
            </li>
          )}

          {/* Page numbers */}
          {range.map((item, index) =>
            item === 'ellipsis' ? (
              <li key={`ellipsis-${index}`}>
                <Ellipsis />
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  className={buttonClasses(item === page)}
                  onClick={() => handlePageChange(item)}
                  disabled={disabled}
                  aria-label={
                    labels?.goToPage?.(item) ??
                    t(
                      'ui.pagination.goToPage',
                      { page: item },
                      { defaultValue: 'Go to page {{page}}' },
                    )
                  }
                  aria-current={item === page ? 'page' : undefined}
                >
                  {item}
                </button>
              </li>
            ),
          )}

          {/* Next page button */}
          {showPrevNext && (
            <li>
              <button
                type="button"
                className={buttonClasses(false)}
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages || disabled}
                aria-label={
                  labels?.next ??
                  t('ui.pagination.next', undefined, { defaultValue: 'Go to next page' })
                }
              >
                {renderIcon('chevron-right', cm.iconSm)}
              </button>
            </li>
          )}

          {/* Last page button */}
          {showFirstLast && (
            <li>
              <button
                type="button"
                className={buttonClasses(false)}
                onClick={() => handlePageChange(totalPages)}
                disabled={page === totalPages || disabled}
                aria-label={
                  labels?.last ??
                  t('ui.pagination.last', undefined, { defaultValue: 'Go to last page' })
                }
              >
                {renderIcon('chevrons-right', cm.iconSm)}
              </button>
            </li>
          )}
        </ul>
      </nav>
    )
  },
)

Pagination.displayName = 'Pagination'
