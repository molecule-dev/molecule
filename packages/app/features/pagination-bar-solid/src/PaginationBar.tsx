/**
 * Solid pagination bar: page window + "Showing X of Y" text + an optional
 * page-size selector.
 *
 * @module
 */

import { type Component, For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Select } from '@molecule/app-ui-solid'

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
 * The React `aria-current={cond ? 'page' : undefined}` spread: Solid's UI
 * component types carry every declared attribute, so the state attribute is
 * spread rather than passed as a JSX attribute.
 *
 * @param current - Whether the page is the current one.
 * @returns The attribute map to spread onto the button.
 */
const currentAttr = (current: boolean): Record<string, string | undefined> =>
  current ? { 'aria-current': 'page' } : {}

/**
 * Paginator with a `[showing text, prev, page-window, next, size-select]` layout.
 *
 * The "Showing X to Y of Z items" text is driven by an i18n key so apps can
 * specialize the noun ("tags", "orders", "transactions"). Page-size selector
 * is hidden unless `pageSizeOptions` + `onPageSizeChange` are supplied.
 *
 * This is the Solid counterpart of `@molecule/app-pagination-bar-react`: the
 * same props (React names) and the same DOM for the same input.
 *
 * @param props - Component props (see {@link PaginationBarProps}).
 * @returns The rendered pagination bar.
 */
export const PaginationBar: Component<PaginationBarProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const pageWindow = (): (number | '...')[] => buildWindow(props.page, props.totalPages)
  const start = (): number => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1)
  const end = (): number => Math.min(props.page * props.pageSize, props.total)

  return (
    <div
      class={cm.cn(
        cm.flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' }),
        props.className,
      )}
    >
      <p class={cm.textSize('sm')}>
        {t(
          props.showingKey ?? 'pagination.showing',
          { start: start(), end: end(), total: props.total.toLocaleString() },
          {
            defaultValue: props.showingDefault ?? 'Showing {{start}} to {{end}} of {{total}} items',
          },
        )}
      </p>
      <div class={cm.flex({ align: 'center', gap: 'xs' })}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => props.onPageChange(Math.max(1, props.page - 1))}
          disabled={props.page === 1}
          aria-label={t('pagination.previous', {}, { defaultValue: 'Previous page' })}
        >
          ‹
        </Button>
        <For each={pageWindow()}>
          {(entry) =>
            entry === '...' ? (
              <span class={cm.sp('px', 2)}>…</span>
            ) : (
              <Button
                variant={entry === props.page ? 'solid' : 'ghost'}
                color={entry === props.page ? 'primary' : undefined}
                size="sm"
                onClick={() => props.onPageChange(entry)}
                {...currentAttr(entry === props.page)}
              >
                {entry}
              </Button>
            )
          }
        </For>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => props.onPageChange(Math.min(props.totalPages, props.page + 1))}
          disabled={props.page === props.totalPages}
          aria-label={t('pagination.next', {}, { defaultValue: 'Next page' })}
        >
          ›
        </Button>
      </div>
      <Show when={props.pageSizeOptions && props.onPageSizeChange}>
        <Select
          value={String(props.pageSize)}
          onValueChange={(value: string) => props.onPageSizeChange?.(Number(value))}
          options={(props.pageSizeOptions ?? []).map((n) => ({
            value: String(n),
            label: String(n),
          }))}
          aria-label={t('pagination.pageSize', {}, { defaultValue: 'Page size' })}
        />
      </Show>
    </div>
  )
}
