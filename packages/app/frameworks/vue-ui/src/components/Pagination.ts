/**
 * Vue Pagination UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType } from 'vue'

import { t } from '@molecule/app-i18n'
import type { Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Generate pagination range with ellipsis.
 * @param currentPage - The current page.
 * @param totalPages - The total pages.
 * @param siblings - The siblings.
 * @param boundaries - The boundaries.
 * @returns The result.
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
 * Vue Pagination UI component with UIClassMap-driven styling.
 */
export const Pagination = defineComponent({
  name: 'MPagination',
  props: {
    page: {
      type: Number,
      required: true,
    },
    totalPages: {
      type: Number,
      required: true,
    },
    siblings: {
      type: Number,
      default: 1,
    },
    boundaries: {
      type: Number,
      default: 1,
    },
    size: {
      type: String as PropType<Size>,
      default: 'md',
    },
    showFirstLast: {
      type: Boolean,
      default: false,
    },
    showPrevNext: {
      type: Boolean,
      default: true,
    },
    disabled: Boolean,
    labels: Object as PropType<{
      nav?: string
      first?: string
      previous?: string
      next?: string
      last?: string
      goToPage?: (page: number) => string
    }>,
    class: String,
  },
  emits: ['update:page', 'change'],
  setup(props, { emit }) {
    const cm = getClassMap()

    const range = computed(() =>
      generatePaginationRange(props.page, props.totalPages, props.siblings, props.boundaries),
    )

    const handlePageChange = (newPage: number): void => {
      if (
        newPage >= 1 &&
        newPage <= props.totalPages &&
        newPage !== props.page &&
        !props.disabled
      ) {
        emit('update:page', newPage)
        emit('change', newPage)
      }
    }

    const buttonClasses = (isActive: boolean): string =>
      cm.cn(
        cm.pagination({
          active: isActive,
          size: props.size,
        }),
        cm.paginationInteractive,
      )

    return () =>
      h(
        'nav',
        {
          role: 'navigation',
          'aria-label':
            props.labels?.nav ?? t('ui.pagination.nav', undefined, { defaultValue: 'Pagination' }),
          class: cm.cn(cm.paginationRoot, props.class),
        },
        h('ul', { class: cm.paginationContent }, [
          // First page button
          props.showFirstLast &&
            h(
              'li',
              null,
              h(
                'button',
                {
                  type: 'button',
                  class: buttonClasses(false),
                  onClick: () => handlePageChange(1),
                  disabled: props.page === 1 || props.disabled,
                  'aria-label':
                    props.labels?.first ??
                    t('ui.pagination.first', undefined, { defaultValue: 'Go to first page' }),
                },
                renderIcon('chevrons-left', cm.iconSm),
              ),
            ),

          // Previous page button
          props.showPrevNext &&
            h(
              'li',
              null,
              h(
                'button',
                {
                  type: 'button',
                  class: buttonClasses(false),
                  onClick: () => handlePageChange(props.page - 1),
                  disabled: props.page === 1 || props.disabled,
                  'aria-label':
                    props.labels?.previous ??
                    t('ui.pagination.previous', undefined, { defaultValue: 'Go to previous page' }),
                },
                renderIcon('chevron-left', cm.iconSm),
              ),
            ),

          // Page numbers
          ...range.value.map((item, index) =>
            item === 'ellipsis'
              ? h(
                  'li',
                  { key: `ellipsis-${index}` },
                  h(
                    'span',
                    { class: cm.paginationEllipsis, 'aria-hidden': 'true' },
                    renderIcon('ellipsis-horizontal', cm.iconSm),
                  ),
                )
              : h(
                  'li',
                  { key: item },
                  h(
                    'button',
                    {
                      type: 'button',
                      class: buttonClasses(item === props.page),
                      onClick: () => handlePageChange(item),
                      disabled: props.disabled,
                      'aria-label':
                        props.labels?.goToPage?.(item) ??
                        t(
                          'ui.pagination.goToPage',
                          { page: item },
                          { defaultValue: 'Go to page {{page}}' },
                        ),
                      'aria-current': item === props.page ? 'page' : undefined,
                    },
                    item,
                  ),
                ),
          ),

          // Next page button
          props.showPrevNext &&
            h(
              'li',
              null,
              h(
                'button',
                {
                  type: 'button',
                  class: buttonClasses(false),
                  onClick: () => handlePageChange(props.page + 1),
                  disabled: props.page === props.totalPages || props.disabled,
                  'aria-label':
                    props.labels?.next ??
                    t('ui.pagination.next', undefined, { defaultValue: 'Go to next page' }),
                },
                renderIcon('chevron-right', cm.iconSm),
              ),
            ),

          // Last page button
          props.showFirstLast &&
            h(
              'li',
              null,
              h(
                'button',
                {
                  type: 'button',
                  class: buttonClasses(false),
                  onClick: () => handlePageChange(props.totalPages),
                  disabled: props.page === props.totalPages || props.disabled,
                  'aria-label':
                    props.labels?.last ??
                    t('ui.pagination.last', undefined, { defaultValue: 'Go to last page' }),
                },
                renderIcon('chevrons-right', cm.iconSm),
              ),
            ),
        ]),
      )
  },
})
