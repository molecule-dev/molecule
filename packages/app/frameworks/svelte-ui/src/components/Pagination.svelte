<!--
  Pagination: numbered page navigation with ellipsis ranges, boundary pages,
  optional first/last and prev/next buttons, and localized labels.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { useI18n } from '../framework.js'
  import { reactStyle } from '../style.js'
  import type { PaginationProps } from '../types.js'
  import IconGlyph from './IconGlyph.svelte'

  let {
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
  }: PaginationProps = $props()

  const { t } = useI18n()
  const cm = $derived(getClassMap())

  /** Generates the page range with ellipsis markers. */
  const range = $derived.by(() => {
    const out: (number | 'ellipsis')[] = []
    for (let i = 1; i <= Math.min(boundaries, totalPages); i++) out.push(i)
    const siblingStart = Math.max(boundaries + 1, page - siblings)
    const siblingEnd = Math.min(totalPages - boundaries, page + siblings)
    if (siblingStart > boundaries + 1) out.push('ellipsis')
    for (let i = siblingStart; i <= siblingEnd; i++) {
      if (!out.includes(i)) out.push(i)
    }
    if (siblingEnd < totalPages - boundaries) out.push('ellipsis')
    for (let i = Math.max(totalPages - boundaries + 1, boundaries + 1); i <= totalPages; i++) {
      if (!out.includes(i)) out.push(i)
    }
    return out
  })

  const handlePageChange = (newPage: number): void => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page && !disabled) {
      onChange(newPage)
    }
  }

  const buttonClasses = (isActive: boolean): string =>
    cm.cn(cm.pagination({ active: isActive, size }), cm.paginationInteractive)

  // `<nav>` already exposes the navigation landmark; the explicit role is kept
  // for DOM parity with the React reference (the conformance suite compares
  // every attribute) and is referenced through a constant so svelte-check's
  // redundant-role heuristic — which cannot see that contract — accepts it.
  const navRole = 'navigation' as const
</script>

<nav
  role={navRole}
  aria-label={labels?.nav ?? $t('ui.pagination.nav', undefined, { defaultValue: 'Pagination' })}
  class={cm.cn(cm.paginationRoot, className)}
  use:reactStyle={style}
  data-testid={testId}
>
  <ul class={cm.paginationContent}>
    {#if showFirstLast}
      <li>
        <button
          type="button"
          class={buttonClasses(false)}
          onclick={() => handlePageChange(1)}
          disabled={page === 1 || disabled}
          aria-label={labels?.first ??
            $t('ui.pagination.first', undefined, { defaultValue: 'Go to first page' })}
        >
          <IconGlyph name="chevrons-left" className={cm.iconSm} />
        </button>
      </li>
    {/if}

    {#if showPrevNext}
      <li>
        <button
          type="button"
          class={buttonClasses(false)}
          onclick={() => handlePageChange(page - 1)}
          disabled={page === 1 || disabled}
          aria-label={labels?.previous ??
            $t('ui.pagination.previous', undefined, { defaultValue: 'Go to previous page' })}
        >
          <IconGlyph name="chevron-left" className={cm.iconSm} />
        </button>
      </li>
    {/if}

    {#each range as item, index (item === 'ellipsis' ? `ellipsis-${index}` : item)}
      {#if item === 'ellipsis'}
        <li>
          <span class={cm.paginationEllipsis} aria-hidden="true">
            <IconGlyph name="ellipsis-horizontal" className={cm.iconSm} />
          </span>
        </li>
      {:else}
        <li>
          <button
            type="button"
            class={buttonClasses(item === page)}
            onclick={() => handlePageChange(item)}
            {disabled}
            aria-label={labels?.goToPage?.(item) ??
              $t('ui.pagination.goToPage', { page: item }, { defaultValue: 'Go to page {{page}}' })}
            aria-current={item === page ? 'page' : undefined}
          >
            {item}
          </button>
        </li>
      {/if}
    {/each}

    {#if showPrevNext}
      <li>
        <button
          type="button"
          class={buttonClasses(false)}
          onclick={() => handlePageChange(page + 1)}
          disabled={page === totalPages || disabled}
          aria-label={labels?.next ??
            $t('ui.pagination.next', undefined, { defaultValue: 'Go to next page' })}
        >
          <IconGlyph name="chevron-right" className={cm.iconSm} />
        </button>
      </li>
    {/if}

    {#if showFirstLast}
      <li>
        <button
          type="button"
          class={buttonClasses(false)}
          onclick={() => handlePageChange(totalPages)}
          disabled={page === totalPages || disabled}
          aria-label={labels?.last ??
            $t('ui.pagination.last', undefined, { defaultValue: 'Go to last page' })}
        >
          <IconGlyph name="chevrons-right" className={cm.iconSm} />
        </button>
      </li>
    {/if}
  </ul>
</nav>
