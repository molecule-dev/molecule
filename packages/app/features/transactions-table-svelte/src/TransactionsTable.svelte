<!--
  TransactionsTable: the Svelte counterpart of
  `@molecule/app-transactions-table-react`'s `TransactionsTable` — date /
  description+icon / category chip / account / signed amount columns, plus the
  loading skeleton, the error state with its retry button, the empty state and
  the optional footer. Same props (React names), same ClassMap tokens, same DOM
  for the same input.

  Inline styles go through `style:` directives (the CSSOM property setters), as
  React's runtime does, so a colour serializes identically in the attribute.
  Whitespace lives inside tags: every text run a browser draws is a single
  expression, exactly React's shape.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { useLocale, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { CategoryStyle, TransactionRowData, TransactionsTableProps } from './types.js'

  let {
    transactions,
    loading = false,
    error,
    onRetry,
    retryLabel,
    categoryStyles,
    currency,
    formatAmount,
    formatDate,
    onRowClick,
    headers,
    emptyState,
    footer,
    className,
  }: TransactionsTableProps = $props()

  const { t } = useTranslation()
  // Read through `$activeLocale` in the deriveds, so the default formatters
  // follow a locale switch. An explicit `formatAmount` / `formatDate` prop
  // still wins.
  const activeLocale = useLocale()

  /**
   * The icon a category key without a style falls back to (React's
   * `NEUTRAL_ICON`). The neutral chip's colours are theme chrome, not data: its
   * tile and chip take `cm.surfaceSecondary` + `cm.textMuted` instead of
   * hardcoded hex.
   */
  const NEUTRAL_ICON = 'receipt'

  /** The skeleton row indexes (React renders six of them). */
  const SKELETON_ROWS = [0, 1, 2, 3, 4, 5]

  // The default formatters (React's defaults), in the app's active locale, the
  // amount in the `currency` prop.
  const amountFormatter = $derived(
    formatAmount ??
      ((n: number): string =>
        new Intl.NumberFormat($activeLocale, {
          style: 'currency',
          currency: currency ?? 'USD',
        }).format(Math.abs(n))),
  )
  const dateFormatter = $derived(
    formatDate ??
      ((d: string | Date): string => {
        if (!d) return ''
        return new Date(d).toLocaleDateString($activeLocale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      }),
  )

  /**
   * The five column headers, in React's order, with the amount right-aligned.
   *
   * @returns The header labels and their alignment.
   */
  function headerCells(): { key: string; label: Snippet | string | number; right: boolean }[] {
    return [
      {
        key: 'date',
        label:
          headers?.date ?? t('transactionsTable.header.date', undefined, { defaultValue: 'Date' }),
        right: false,
      },
      {
        key: 'description',
        label:
          headers?.description ??
          t('transactionsTable.header.description', undefined, { defaultValue: 'Description' }),
        right: false,
      },
      {
        key: 'category',
        label:
          headers?.category ??
          t('transactionsTable.header.category', undefined, { defaultValue: 'Category' }),
        right: false,
      },
      {
        key: 'account',
        label:
          headers?.account ??
          t('transactionsTable.header.account', undefined, { defaultValue: 'Account' }),
        right: false,
      },
      {
        key: 'amount',
        label:
          headers?.amount ??
          t('transactionsTable.header.amount', undefined, { defaultValue: 'Amount' }),
        right: true,
      },
    ]
  }

  /**
   * The caller-supplied category style a row uses (React lowercases the key),
   * or undefined for the theme's neutral chip (`cm.surfaceSecondary` +
   * `cm.textMuted`, React's neutral fallback).
   *
   * @param tx - The row.
   * @returns The style for its category, or undefined for the neutral chip.
   */
  function categoryStyle(tx: TransactionRowData): CategoryStyle | undefined {
    return categoryStyles?.[tx.categoryKey.toLowerCase()]
  }

  /**
   * React's sign detection: `isIncome` wins, otherwise a non-negative amount is
   * income.
   *
   * @param tx - The row.
   * @returns True when the row is income.
   */
  function isIncome(tx: TransactionRowData): boolean {
    return tx.isIncome ?? tx.amount >= 0
  }

  const cm = getClassMap()

  const errorShown = $derived(Boolean(error))
  const emptyShown = $derived(transactions.length === 0 && Boolean(emptyState))
</script>

{#snippet node(value: Snippet | string | number | undefined)}
  {#if typeof value === 'function'}{@render value?.()}{:else}{value ?? ''}{/if}
{/snippet}

{#if loading}
  <div
    class={cm.cn(cm.transactionsTableShell, cm.sp('p', 6), className)}
    data-mol-id="transactions-table-loading"
  >
    {#each SKELETON_ROWS as index (index)}
      <div aria-hidden="true" class={cm.cn(cm.transactionsTableSkeletonRow, cm.sp('mb', 3))}></div>
    {/each}
  </div>
{:else if errorShown}
  <div
    role="alert"
    class={cm.cn(cm.transactionsTableShell, cm.sp('p', 10), cm.textCenter, className)}
    data-mol-id="transactions-table-error"
  >
    <p class={cm.cn(cm.transactionsTableTertiaryText, cm.textSize('sm'), cm.sp('mb', 3))}>
      {@render node(error)}
    </p>
    {#if onRetry}
      <button
        type="button"
        data-mol-id="transactions-table-retry"
        onclick={onRetry}
        class={cm.cn(
          cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
          cm.touchTargetCompact,
        )}
        >{@render node(
          retryLabel ??
            t('transactionsTable.label.retry', undefined, { defaultValue: 'Try again' }),
        )}</button
      >
    {/if}
  </div>
{:else if emptyShown}
  <div
    class={cm.cn(cm.transactionsTableShell, cm.sp('p', 12), cm.textCenter, cm.stack(4), className)}
    data-mol-id="transactions-table-empty"
  >
    {@render node(emptyState)}
  </div>
{:else}
  <div class={cm.cn(cm.transactionsTableShell, className)}>
    <div class={cm.cn(cm.transactionsTableScroller)}>
      <table class={cm.cn(cm.w('full'), cm.transactionsTableTable)}>
        <thead>
          <tr class={cm.cn(cm.transactionsTableHeadRow)}>
            {#each headerCells() as header (header.key)}
              <th
                class={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 5),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  cm.transactionsTableHeaderCell,
                  header.right ? cm.textRight : '',
                )}>{@render node(header.label)}</th
              >
            {/each}
          </tr>
        </thead>
        <tbody class={cm.cn(cm.transactionsTableBody)}>
          {#each transactions as tx (tx.id)}
            <tr
              data-mol-id="transactions-table-row"
              class={cm.cn(onRowClick ? cm.cursorPointer : '', cm.transactionsTableRow)}
              onclick={onRowClick ? (): void => onRowClick?.(tx) : undefined}
            >
              <td
                class={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 5),
                  cm.textSize('sm'),
                  cm.transactionsTableDateCell,
                )}>{dateFormatter(tx.date)}</td
              >
              <td class={cm.cn(cm.sp('px', 6), cm.sp('py', 5))}>
                <div
                  class={cm.cn(cm.flex({ align: 'center' }), cm.transactionsTableDescriptionRow)}
                >
                  <!-- A caller-supplied style is the caller's colour data, applied inline; a
                    key without one falls back to the theme's neutral chip (`cm.surfaceSecondary`
                    + `cm.textMuted`), so no inline colour overrides those classes. -->
                  <div
                    class={cm.cn(
                      cm.w(10),
                      cm.h(10),
                      cm.roundedFull,
                      cm.flex({ align: 'center', justify: 'center' }),
                      !categoryStyle(tx) && [cm.surfaceSecondary, cm.textMuted],
                    )}
                    style:background-color={categoryStyle(tx)?.bg}
                    style:color={categoryStyle(tx)?.color}
                  >
                    <!-- The ligature name is font data, not text; the chip names the category. -->
                    <span aria-hidden="true" class={cm.iconGlyphFont}
                      >{categoryStyle(tx)?.icon ?? NEUTRAL_ICON}</span
                    >
                  </div>
                  <span class={cm.cn(cm.fontWeight('bold'), cm.transactionsTableDescription)}
                    >{@render node(tx.description)}</span
                  >
                </div>
              </td>
              <td class={cm.cn(cm.sp('px', 6), cm.sp('py', 5))}>
                <span
                  class={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 1),
                    cm.fontWeight('bold'),
                    cm.roundedFull,
                    cm.transactionsTableCategoryChip,
                    !categoryStyle(tx) && [cm.surfaceSecondary, cm.textMuted],
                  )}
                  style:background-color={categoryStyle(tx)?.bg}
                  style:color={categoryStyle(tx)?.color}>{@render node(tx.categoryLabel)}</span
                >
              </td>
              <td
                class={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 5),
                  cm.textSize('sm'),
                  cm.transactionsTableAccountCell,
                )}>{@render node(tx.account)}</td
              >
              <td
                class={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 5),
                  cm.textRight,
                  cm.fontWeight('bold'),
                  cm.transactionsTableAmountCell,
                  isIncome(tx) ? cm.textPrimary : cm.transactionsTableTertiaryText,
                )}>{isIncome(tx) ? '+' : '-'}{amountFormatter(tx.amount)}</td
              >
            </tr>
          {/each}
        </tbody>
      </table>
      {#if footer !== undefined && footer !== null}{@render node(footer)}{/if}
    </div>
  </div>
{/if}
