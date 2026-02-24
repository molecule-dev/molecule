/**
 * Pagination component.
 *
 * @module
 */

import { type Component, createMemo, For, Show, splitProps } from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { PaginationProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.jsx'

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
 * Pagination component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Pagination: Component<PaginationProps> = (props) => {
  const [local] = splitProps(props, [
    'page',
    'totalPages',
    'onChange',
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
  ])

  const cm = getClassMap()
  const siblings = (): number => local.siblings ?? 1
  const boundaries = (): number => local.boundaries ?? 1
  const showFirstLast = (): boolean => local.showFirstLast ?? false
  const showPrevNext = (): boolean => local.showPrevNext ?? true

  const range = createMemo(() =>
    generatePaginationRange(local.page, local.totalPages, siblings(), boundaries()),
  )

  const handlePageChange = (newPage: number): void => {
    if (newPage >= 1 && newPage <= local.totalPages && newPage !== local.page && !local.disabled) {
      local.onChange(newPage)
    }
  }

  const buttonClasses = (isActive: boolean): string =>
    cm.cn(
      cm.pagination({
        active: isActive,
        size: local.size,
      }),
      cm.paginationInteractive,
    )

  return (
    <nav
      role="navigation"
      aria-label={
        local.labels?.nav ?? t('ui.pagination.nav', undefined, { defaultValue: 'Pagination' })
      }
      class={cm.cn(cm.paginationRoot, local.className)}
      style={local.style}
      data-testid={local.testId}
    >
      <ul class={cm.paginationContent}>
        {/* First page button */}
        <Show when={showFirstLast()}>
          <li>
            <button
              type="button"
              class={buttonClasses(false)}
              onClick={() => handlePageChange(1)}
              disabled={local.page === 1 || local.disabled}
              aria-label={
                local.labels?.first ??
                t('ui.pagination.first', undefined, { defaultValue: 'Go to first page' })
              }
            >
              {renderIcon('chevrons-left', cm.iconSm)}
            </button>
          </li>
        </Show>

        {/* Previous page button */}
        <Show when={showPrevNext()}>
          <li>
            <button
              type="button"
              class={buttonClasses(false)}
              onClick={() => handlePageChange(local.page - 1)}
              disabled={local.page === 1 || local.disabled}
              aria-label={
                local.labels?.previous ??
                t('ui.pagination.previous', undefined, { defaultValue: 'Go to previous page' })
              }
            >
              {renderIcon('chevron-left', cm.iconSm)}
            </button>
          </li>
        </Show>

        {/* Page numbers */}
        <For each={range()}>
          {(item, _index) => (
            <Show
              when={item !== 'ellipsis'}
              fallback={
                <li>
                  <span class={cm.paginationEllipsis} aria-hidden="true">
                    {renderIcon('ellipsis-horizontal', cm.iconSm)}
                  </span>
                </li>
              }
            >
              <li>
                <button
                  type="button"
                  class={buttonClasses((item as number) === local.page)}
                  onClick={() => handlePageChange(item as number)}
                  disabled={local.disabled}
                  aria-label={
                    local.labels?.goToPage?.(item as number) ??
                    t(
                      'ui.pagination.goToPage',
                      { page: item as number },
                      { defaultValue: 'Go to page {{page}}' },
                    )
                  }
                  aria-current={(item as number) === local.page ? 'page' : undefined}
                >
                  {item as number}
                </button>
              </li>
            </Show>
          )}
        </For>

        {/* Next page button */}
        <Show when={showPrevNext()}>
          <li>
            <button
              type="button"
              class={buttonClasses(false)}
              onClick={() => handlePageChange(local.page + 1)}
              disabled={local.page === local.totalPages || local.disabled}
              aria-label={
                local.labels?.next ??
                t('ui.pagination.next', undefined, { defaultValue: 'Go to next page' })
              }
            >
              {renderIcon('chevron-right', cm.iconSm)}
            </button>
          </li>
        </Show>

        {/* Last page button */}
        <Show when={showFirstLast()}>
          <li>
            <button
              type="button"
              class={buttonClasses(false)}
              onClick={() => handlePageChange(local.totalPages)}
              disabled={local.page === local.totalPages || local.disabled}
              aria-label={
                local.labels?.last ??
                t('ui.pagination.last', undefined, { defaultValue: 'Go to last page' })
              }
            >
              {renderIcon('chevrons-right', cm.iconSm)}
            </button>
          </li>
        </Show>
      </ul>
    </nav>
  )
}
