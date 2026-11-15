<!--
  PaginationBar: the Svelte counterpart of
  `@molecule/app-pagination-bar-react`'s `PaginationBar` — page-window +
  "Showing X of Y" text + an optional page-size selector, with the same props
  (React names) and the same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Select } from '@molecule/app-ui-svelte'

  import type { PaginationBarProps } from './types.js'

  let {
    page,
    totalPages,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions,
    showingKey = 'pagination.showing',
    showingDefault = 'Showing {{start}} to {{end}} of {{total}} items',
    className,
  }: PaginationBarProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /**
   * Builds the visible page-number window (with ellipsis sentinels) for the
   * given page and total.
   *
   * @param current - The current page (1-indexed).
   * @param pages - The total page count.
   * @returns The page numbers and `'...'` sentinels to render.
   */
  function buildWindow(current: number, pages: number): (number | '...')[] {
    const out: (number | '...')[] = []
    if (pages <= 5) {
      for (let i = 1; i <= pages; i++) out.push(i)
      return out
    }
    out.push(1)
    if (current > 3) out.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(pages - 1, current + 1); i++) out.push(i)
    if (current < pages - 2) out.push('...')
    if (pages > 1) out.push(pages)
    return out
  }

  /**
   * React's `aria-current={cond ? 'page' : undefined}` as a spread, so the
   * state attribute reaches the button through the component's rest props.
   *
   * @param current - Whether the page is the current one.
   * @returns The attribute map to spread onto the button.
   */
  const currentAttr = (current: boolean): Record<string, string> =>
    current ? { 'aria-current': 'page' } : {}

  const start = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1)
  const end = $derived(Math.min(page * pageSize, total))
  const pageWindow = $derived(buildWindow(page, totalPages))
  const summary = $derived(
    t(showingKey, { start, end, total: total.toLocaleString() }, { defaultValue: showingDefault }),
  )
  const selectOptions = $derived(
    pageSizeOptions?.map((n) => ({ value: String(n), label: String(n) })),
  )
</script>

<div
  class={cm.cn(
    cm.flex({ justify: 'between', align: 'center', gap: 'md', wrap: 'wrap' }),
    className,
  )}
>
  <p class={cm.textSize('sm')}>{summary}</p>
  <div class={cm.flex({ align: 'center', gap: 'xs' })}>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onPageChange(Math.max(1, page - 1))}
      disabled={page === 1}
      aria-label={t('pagination.previous', {}, { defaultValue: 'Previous page' })}
    >
      ‹
    </Button>
    {#each pageWindow as entry, i (entry === '...' ? `el-${i}` : entry)}
      {#if entry === '...'}
        <span class={cm.sp('px', 2)}>…</span>
      {:else}
        <Button
          variant={entry === page ? 'solid' : 'ghost'}
          color={entry === page ? 'primary' : undefined}
          size="sm"
          onClick={() => onPageChange(entry)}
          {...currentAttr(entry === page)}
        >
          {entry}
        </Button>
      {/if}
    {/each}
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      disabled={page === totalPages}
      aria-label={t('pagination.next', {}, { defaultValue: 'Next page' })}
    >
      ›
    </Button>
  </div>
  {#if pageSizeOptions && onPageSizeChange && selectOptions}
    <Select
      value={String(pageSize)}
      onValueChange={(value) => onPageSizeChange?.(Number(value))}
      options={selectOptions}
      aria-label={t('pagination.pageSize', {}, { defaultValue: 'Page size' })}
    />
  {/if}
</div>
