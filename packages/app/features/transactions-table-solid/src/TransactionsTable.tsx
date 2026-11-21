/**
 * Solid financial transactions table: date / description+icon / category chip /
 * account / signed amount columns, plus loading skeleton, error state, and
 * empty state.
 *
 * Solid counterpart of `@molecule/app-transactions-table-react`'s
 * `TransactionsTable` — the same props (React names), the same ClassMap
 * tokens, and the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, type JSX, Match, Switch } from 'solid-js'

import { useLocale, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { CategoryStyle, TransactionRowData, TransactionsTableProps } from './types.js'

/**
 * The icon a category key without a style falls back to (React's
 * `NEUTRAL_ICON`). The neutral chip's colours are theme chrome, not data: its
 * tile and chip take `cm.surfaceSecondary` + `cm.textMuted` instead of
 * hardcoded hex.
 */
const NEUTRAL_ICON = 'receipt'

/** One column header: its label node and whether React right-aligns it. */
interface HeaderCell {
  key: string
  label: JSX.Element
  right: boolean
}

/** The skeleton row indexes (React renders six of them). */
const SKELETON_ROWS = [0, 1, 2, 3, 4, 5]

/**
 * Renders a pageable financial transactions table with loading, error, and
 * empty states.
 *
 * Columns: Date / Description (with a category icon tile) / Category chip /
 * Account / signed Amount, income tinted with the theme's `primary` token and
 * expense with `tertiary`. Stateless about routing — pass `onRowClick` to
 * navigate, or omit it to render an inert table.
 *
 * @param props - Component props (see {@link TransactionsTableProps}).
 * @returns The rendered transactions table.
 */
export const TransactionsTable: Component<TransactionsTableProps> = (props) => {
  const { t } = useTranslation()
  // Read inside the accessors, so the default formatters follow a locale
  // switch. An explicit `formatAmount` / `formatDate` prop still wins.
  const activeLocale = useLocale()
  const cm = getClassMap()
  /** React's `if (error)` truthiness. */
  const errorShown = (): boolean => Boolean(props.error)
  /** React's `transactions.length === 0 && emptyState`. */
  const emptyShown = (): boolean => props.transactions.length === 0 && Boolean(props.emptyState)
  /** The five column headers, in React's order, with the amount right-aligned. */
  const headerCells = (): HeaderCell[] => [
    {
      key: 'date',
      label:
        props.headers?.date ??
        t('transactionsTable.header.date', undefined, { defaultValue: 'Date' }),
      right: false,
    },
    {
      key: 'description',
      label:
        props.headers?.description ??
        t('transactionsTable.header.description', undefined, { defaultValue: 'Description' }),
      right: false,
    },
    {
      key: 'category',
      label:
        props.headers?.category ??
        t('transactionsTable.header.category', undefined, { defaultValue: 'Category' }),
      right: false,
    },
    {
      key: 'account',
      label:
        props.headers?.account ??
        t('transactionsTable.header.account', undefined, { defaultValue: 'Account' }),
      right: false,
    },
    {
      key: 'amount',
      label:
        props.headers?.amount ??
        t('transactionsTable.header.amount', undefined, { defaultValue: 'Amount' }),
      right: true,
    },
  ]
  /**
   * The caller-supplied category style a row uses (React lowercases the key),
   * or undefined for the theme's neutral chip (`cm.surfaceSecondary` +
   * `cm.textMuted`, React's neutral fallback).
   */
  const categoryStyle = (tx: TransactionRowData): CategoryStyle | undefined =>
    props.categoryStyles?.[tx.categoryKey.toLowerCase()]

  return (
    <Switch>
      <Match when={props.loading}>
        <div
          class={cm.cn(cm.transactionsTableShell, cm.sp('p', 6), props.className)}
          data-mol-id="transactions-table-loading"
        >
          <For each={SKELETON_ROWS}>
            {() => (
              <div
                aria-hidden="true"
                class={cm.cn(cm.transactionsTableSkeletonRow, cm.sp('mb', 3))}
              />
            )}
          </For>
        </div>
      </Match>
      <Match when={errorShown()}>
        <div
          role="alert"
          class={cm.cn(cm.transactionsTableShell, cm.sp('p', 10), cm.textCenter, props.className)}
          data-mol-id="transactions-table-error"
        >
          <p class={cm.cn(cm.transactionsTableTertiaryText, cm.textSize('sm'), cm.sp('mb', 3))}>
            {props.error}
          </p>
          {props.onRetry ? (
            <button
              type="button"
              data-mol-id="transactions-table-retry"
              onClick={props.onRetry}
              class={cm.cn(
                cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
                cm.touchTargetCompact,
              )}
            >
              {props.retryLabel ??
                t('transactionsTable.label.retry', undefined, { defaultValue: 'Try again' })}
            </button>
          ) : undefined}
        </div>
      </Match>
      <Match when={emptyShown()}>
        <div
          class={cm.cn(
            cm.transactionsTableShell,
            cm.sp('p', 12),
            cm.textCenter,
            cm.stack(4),
            props.className,
          )}
          data-mol-id="transactions-table-empty"
        >
          {props.emptyState}
        </div>
      </Match>
      <Match when={true}>
        <div class={cm.cn(cm.transactionsTableShell, props.className)}>
          <div class={cm.cn(cm.transactionsTableScroller)}>
            <table class={cm.cn(cm.w('full'), cm.transactionsTableTable)}>
              <thead>
                <tr class={cm.cn(cm.transactionsTableHeadRow)}>
                  <For each={headerCells()}>
                    {(header) => (
                      <th
                        class={cm.cn(
                          cm.sp('px', 6),
                          cm.sp('py', 5),
                          cm.textSize('xs'),
                          cm.fontWeight('bold'),
                          cm.transactionsTableHeaderCell,
                          header.right ? cm.textRight : '',
                        )}
                      >
                        {header.label}
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody class={cm.cn(cm.transactionsTableBody)}>
                <For each={props.transactions}>
                  {(tx) => {
                    const isIncome = (): boolean => tx.isIncome ?? tx.amount >= 0
                    const formatAmount = (): ((amount: number) => string) =>
                      props.formatAmount ??
                      ((n: number): string =>
                        new Intl.NumberFormat(activeLocale(), {
                          style: 'currency',
                          currency: props.currency ?? 'USD',
                        }).format(Math.abs(n)))
                    const formatDate = (): ((date: string | Date) => string) =>
                      props.formatDate ??
                      ((d: string | Date): string => {
                        if (!d) return ''
                        return new Date(d).toLocaleDateString(activeLocale(), {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      })
                    // A caller-supplied style is the caller's colour data, applied
                    // inline; a key without one falls back to the theme's neutral
                    // chip (`cm.surfaceSecondary` + `cm.textMuted`), so no inline
                    // colour overrides those classes.
                    const style = (): CategoryStyle | undefined => categoryStyle(tx)
                    const neutralChip = (): boolean => !style()
                    const colourStyle = ():
                      { 'background-color': string; color: string } | undefined => {
                      const s = style()
                      return s ? { 'background-color': s.bg, color: s.color } : undefined
                    }
                    return (
                      <tr
                        data-mol-id="transactions-table-row"
                        class={cm.cn(
                          props.onRowClick ? cm.cursorPointer : '',
                          cm.transactionsTableRow,
                        )}
                        onClick={props.onRowClick ? (): void => props.onRowClick?.(tx) : undefined}
                      >
                        <td
                          class={cm.cn(
                            cm.sp('px', 6),
                            cm.sp('py', 5),
                            cm.textSize('sm'),
                            cm.transactionsTableDateCell,
                          )}
                        >
                          {formatDate()(tx.date)}
                        </td>
                        <td class={cm.cn(cm.sp('px', 6), cm.sp('py', 5))}>
                          <div
                            class={cm.cn(
                              cm.flex({ align: 'center' }),
                              cm.transactionsTableDescriptionRow,
                            )}
                          >
                            <div
                              class={cm.cn(
                                cm.w(10),
                                cm.h(10),
                                cm.roundedFull,
                                cm.flex({ align: 'center', justify: 'center' }),
                                neutralChip() && [cm.surfaceSecondary, cm.textMuted],
                              )}
                              style={colourStyle()}
                            >
                              {/* The ligature name is font data, not text; the chip names the
                                category. */}
                              <span aria-hidden="true" class={cm.iconGlyphFont}>
                                {style()?.icon ?? NEUTRAL_ICON}
                              </span>
                            </div>
                            <span
                              class={cm.cn(cm.fontWeight('bold'), cm.transactionsTableDescription)}
                            >
                              {tx.description}
                            </span>
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
                              neutralChip() && [cm.surfaceSecondary, cm.textMuted],
                            )}
                            style={colourStyle()}
                          >
                            {tx.categoryLabel}
                          </span>
                        </td>
                        <td
                          class={cm.cn(
                            cm.sp('px', 6),
                            cm.sp('py', 5),
                            cm.textSize('sm'),
                            cm.transactionsTableAccountCell,
                          )}
                        >
                          {tx.account}
                        </td>
                        <td
                          class={cm.cn(
                            cm.sp('px', 6),
                            cm.sp('py', 5),
                            cm.textRight,
                            cm.fontWeight('bold'),
                            cm.transactionsTableAmountCell,
                            isIncome() ? cm.textPrimary : cm.transactionsTableTertiaryText,
                          )}
                        >
                          {`${isIncome() ? '+' : '-'}${formatAmount()(tx.amount)}`}
                        </td>
                      </tr>
                    )
                  }}
                </For>
              </tbody>
            </table>
            {props.footer}
          </div>
        </div>
      </Match>
    </Switch>
  )
}
