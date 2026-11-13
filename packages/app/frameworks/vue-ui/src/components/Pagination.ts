/**
 * Vue Pagination UI component with UIClassMap-driven styling.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType } from 'vue'

import type { PaginationProps, Size } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { classOf, styleOf } from '../utilities/attrs.js'
import { renderIcon } from '../utilities/renderIcon.js'

/** CSS properties that take unitless numbers; every other numeric value gets `px`. */
const UNITLESS_STYLE_PROPERTIES = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexNegative',
  'flexOrder',
  'flexPositive',
  'flexShrink',
  'fontSynthesisWeight',
  'fontWeight',
  'gridArea',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnStart',
  'gridRow',
  'gridRowEnd',
  'gridRowStart',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'scale',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
])

/**
 * Applies React's inline-style number rule to a style object: numbers of
 * unit-bearing properties become `"<n>px"` strings. Vue's style patcher sets
 * raw numbers, which the CSSOM silently drops for unit-bearing properties,
 * while React (and therefore the conformance goldens) appends `px`.
 *
 * @param style - A camelCase style object.
 * @returns The same declarations with React's unit spelling.
 */
function withReactStyleUnits(
  style: Record<string, string | number | undefined>,
): Record<string, string | number | undefined> {
  const out: Record<string, string | number | undefined> = {}
  for (const [key, value] of Object.entries(style)) {
    out[key] =
      typeof value === 'number' && !UNITLESS_STYLE_PROPERTIES.has(key) ? `${value}px` : value
  }
  return out
}

/**
 * Normalizes any `h()`-acceptable style value's objects with React's number
 * rule, leaving declaration strings (and arrays of them) untouched.
 *
 * @param value - A style value from {@link styleOf}.
 * @returns The style value with object members unit-normalized.
 */
function normalizeStyleObjects(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeStyleObjects)
  if (value && typeof value === 'object') {
    return withReactStyleUnits(value as Record<string, string | number | undefined>)
  }
  return value
}

/** The pagination `labels` prop shape (React's `PaginationProps['labels']`). */
type PaginationLabels = PaginationProps['labels']

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
 * Vue Pagination UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Pagination: a `role="navigation"`
 * nav whose page-list window (`generatePaginationRange`, with ellipses,
 * siblings and boundaries), prev/next/first/last controls, `aria-current`
 * wiring and label fallbacks match React exactly. Page changes are emitted as
 * `change` (React's `onChange`) with the new page number, guarded the same way:
 * in range, not the current page, and not while `disabled`.
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
    labels: Object as PropType<PaginationLabels>,
    disabled: {
      type: Boolean,
      default: false,
    },
    className: String,
    style: [String, Object] as PropType<PaginationProps['style']>,
    testId: String,
  },
  emits: ['change'],
  setup(props, { attrs, emit }) {
    const cm = getClassMap()
    const { t } = useTranslation()

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
        emit('change', newPage)
      }
    }

    const buttonClasses = (isActive: boolean): string =>
      cm.cn(cm.pagination({ active: isActive, size: props.size }), cm.paginationInteractive)

    return () =>
      h(
        'nav',
        {
          role: 'navigation',
          'aria-label':
            props.labels?.nav ?? t('ui.pagination.nav', undefined, { defaultValue: 'Pagination' }),
          class: cm.cn(cm.paginationRoot, ...classOf(props.className, attrs)),
          style: normalizeStyleObjects(styleOf(props.style, attrs)),
          'data-testid': props.testId,
        },
        [
          h('ul', { class: cm.paginationContent }, [
            // First page button
            props.showFirstLast &&
              h(
                'li',
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
                h(
                  'button',
                  {
                    type: 'button',
                    class: buttonClasses(false),
                    onClick: () => handlePageChange(props.page - 1),
                    disabled: props.page === 1 || props.disabled,
                    'aria-label':
                      props.labels?.previous ??
                      t('ui.pagination.previous', undefined, {
                        defaultValue: 'Go to previous page',
                      }),
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
                    // Ellipsis indicator (React's inline `Ellipsis` element).
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
        ],
      )
  },
})
