/**
 * Pagination component.
 *
 * @module
 */

import { type Component, createMemo, For, type JSX, Show, splitProps } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { PaginationProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { createKeyedList } from '../utilities/keyedList.js'
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
 * Renders the ellipsis indicator.
 * @returns The ellipsis JSX element.
 */
const Ellipsis = (): JSX.Element => {
  const cm = getClassMap()
  return (
    <span class={cm.paginationEllipsis} aria-hidden="true">
      {renderIcon('ellipsis-horizontal', cm.iconSm)}
    </span>
  )
}

/**
 * Renders the Pagination component.
 * @param props - The component props.
 * @returns The rendered pagination JSX.
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
  const { t } = useTranslation()

  const page = (): number => local.page
  const totalPages = (): number => local.totalPages
  const size = (): 'xs' | 'sm' | 'md' | 'lg' | 'xl' => local.size ?? 'md'

  const range = createMemo(() =>
    generatePaginationRange(page(), totalPages(), local.siblings ?? 1, local.boundaries ?? 1),
  )

  // React keys the range entries (`key={item}`, `key={`ellipsis-${index}`}`):
  // an entry's node survives an update whose key is unchanged. `<For>` keys by
  // object identity, so the render iterates the KEYS; a page number's key is
  // the number itself, an ellipsis's is its position.
  const rangeKeys = createKeyedList(range, (item, index) =>
    item === 'ellipsis' ? `ellipsis-${index}` : item,
  )

  const handlePageChange = (newPage: number): void => {
    if (newPage >= 1 && newPage <= totalPages() && newPage !== page() && !local.disabled) {
      local.onChange(newPage)
    }
  }

  const buttonClasses = (isActive: boolean): string =>
    cm.cn(cm.pagination({ active: isActive, size: size() }), cm.paginationInteractive)

  return (
    <nav
      role="navigation"
      aria-label={
        local.labels?.nav ?? t('ui.pagination.nav', undefined, { defaultValue: 'Pagination' })
      }
      class={cm.cn(cm.paginationRoot, local.className)}
      style={toStyleProps(local.style)}
      data-testid={local.testId}
    >
      <ul class={cm.paginationContent}>
        {/* First page button */}
        <Show when={local.showFirstLast ?? false}>
          <li>
            <button
              type="button"
              class={buttonClasses(false)}
              onClick={() => handlePageChange(1)}
              disabled={page() === 1 || local.disabled}
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
        <Show when={local.showPrevNext ?? true}>
          <li>
            <button
              type="button"
              class={buttonClasses(false)}
              onClick={() => handlePageChange(page() - 1)}
              disabled={page() === 1 || local.disabled}
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
        <For each={rangeKeys.keys()}>
          {(key) =>
            typeof key === 'number' ? (
              <li>
                <button
                  type="button"
                  class={buttonClasses(key === page())}
                  onClick={() => handlePageChange(key)}
                  disabled={local.disabled}
                  aria-label={
                    local.labels?.goToPage?.(key) ??
                    t(
                      'ui.pagination.goToPage',
                      { page: key },
                      { defaultValue: 'Go to page {{page}}' },
                    )
                  }
                  aria-current={key === page() ? 'page' : undefined}
                >
                  {key}
                </button>
              </li>
            ) : (
              <li>
                <Ellipsis />
              </li>
            )
          }
        </For>

        {/* Next page button */}
        <Show when={local.showPrevNext ?? true}>
          <li>
            <button
              type="button"
              class={buttonClasses(false)}
              onClick={() => handlePageChange(page() + 1)}
              disabled={page() === totalPages() || local.disabled}
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
        <Show when={local.showFirstLast ?? false}>
          <li>
            <button
              type="button"
              class={buttonClasses(false)}
              onClick={() => handlePageChange(totalPages())}
              disabled={page() === totalPages() || local.disabled}
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
