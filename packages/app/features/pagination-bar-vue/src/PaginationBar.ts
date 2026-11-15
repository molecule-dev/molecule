/**
 * Vue pagination bar: page window + "Showing X of Y" text + an optional
 * page-size selector.
 *
 * Vue counterpart of `@molecule/app-pagination-bar-react`'s `PaginationBar` —
 * the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button, Select } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { PaginationBarProps } from './types.js'

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
 * Paginator with a `[showing text, prev, page-window, next, size-select]` layout.
 *
 * The "Showing X to Y of Z items" text is driven by an i18n key so apps can
 * specialize the noun ("tags", "orders", "transactions"). Page-size selector
 * is hidden unless `pageSizeOptions` + `onPageSizeChange` are supplied.
 *
 * @param props - Component props (see {@link PaginationBarProps}).
 * @returns The pagination bar component.
 */
export const PaginationBar = defineComponent({
  name: 'PaginationBar',
  props: {
    page: {
      type: Number,
      required: true,
    },
    totalPages: {
      type: Number,
      required: true,
    },
    pageSize: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    onPageChange: {
      type: Function as PropType<PaginationBarProps['onPageChange']>,
      required: true,
    },
    onPageSizeChange: {
      type: Function as PropType<PaginationBarProps['onPageSizeChange']>,
    },
    pageSizeOptions: {
      type: Array as PropType<number[]>,
    },
    showingKey: {
      type: String,
      default: 'pagination.showing',
    },
    showingDefault: {
      type: String,
      default: 'Showing {{start}} to {{end}} of {{total}} items',
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const start = props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1
      const end = Math.min(props.page * props.pageSize, props.total)
      const window = buildWindow(props.page, props.totalPages)

      return h(
        'div',
        {
          class: cm.cn(
            cm.flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' }),
            props.className,
          ),
        },
        [
          h(
            'p',
            { class: cm.textSize('sm') },
            t(
              props.showingKey,
              { start, end, total: props.total.toLocaleString() },
              { defaultValue: props.showingDefault },
            ),
          ),
          h('div', { class: cm.flex({ align: 'center', gap: 'xs' }) }, [
            h(
              Button,
              {
                variant: 'ghost',
                size: 'sm',
                onClick: () => props.onPageChange(Math.max(1, props.page - 1)),
                disabled: props.page === 1,
                'aria-label': t('pagination.previous', {}, { defaultValue: 'Previous page' }),
              },
              () => '‹',
            ),
            ...window.map((p, i) =>
              p === '...'
                ? h('span', { key: `el-${i}`, class: cm.sp('px', 2) }, '…')
                : h(
                    Button,
                    {
                      key: p,
                      variant: p === props.page ? 'solid' : 'ghost',
                      color: p === props.page ? 'primary' : undefined,
                      size: 'sm',
                      onClick: () => props.onPageChange(p),
                      'aria-current': p === props.page ? 'page' : undefined,
                    },
                    () => String(p),
                  ),
            ),
            h(
              Button,
              {
                variant: 'ghost',
                size: 'sm',
                onClick: () => props.onPageChange(Math.min(props.totalPages, props.page + 1)),
                disabled: props.page === props.totalPages,
                'aria-label': t('pagination.next', {}, { defaultValue: 'Next page' }),
              },
              () => '›',
            ),
          ]),
          props.pageSizeOptions && props.onPageSizeChange
            ? h(Select, {
                value: String(props.pageSize),
                onValueChange: (value: string) => props.onPageSizeChange?.(Number(value)),
                options: props.pageSizeOptions.map((n) => ({ value: String(n), label: String(n) })),
                'aria-label': t('pagination.pageSize', {}, { defaultValue: 'Page size' }),
              })
            : null,
        ],
      )
    }
  },
})
