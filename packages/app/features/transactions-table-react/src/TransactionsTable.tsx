/**
 * Financial transactions table with date / description+icon / category
 * chip / account / signed amount columns, plus loading skeleton, error
 * state, and empty state.
 *
 * Stateless about routing — pass `onRowClick` to navigate, or omit it
 * to render an inert table.
 *
 * @module
 */

import type { JSX, ReactNode } from 'react'

import { useLocale, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, TableBox, TableCell, Text } from '@molecule/app-ui-react/elements'

import type { CategoryStyle, TransactionRowData } from './types.js'

/** Props for the {@link TransactionsTable} component. */
export interface TransactionsTableProps {
  transactions: TransactionRowData[]
  loading?: boolean
  error?: ReactNode
  onRetry?: () => void
  /**
   * Label of the retry button. Overrides the translated default
   * (`transactionsTable.label.retry`, English `'Try again'`).
   */
  retryLabel?: ReactNode
  /**
   * Map a category key (lowercased automatically) to a style; a key without an
   * entry falls back to the theme's neutral chip (`cm.surfaceSecondary` +
   * `cm.textMuted`, the `receipt` icon).
   */
  categoryStyles?: Record<string, CategoryStyle>
  /**
   * ISO 4217 code the default amount formatter formats in (`'USD'` when
   * omitted); a `formatAmount` prop wins over it.
   */
  currency?: string
  /**
   * Localised currency formatter; defaults to the app's active locale
   * (`useLocale()`) and the `currency` prop, so a locale switch re-formats at
   * once. An explicit formatter still wins.
   */
  formatAmount?: (amount: number) => string
  /**
   * Localised date formatter ("MMM d, yyyy"); defaults to the app's active
   * locale (`useLocale()`), so a locale switch re-formats at once. An explicit
   * formatter still wins.
   */
  formatDate?: (date: string | Date) => string
  /** Click handler for each row (typically navigates to a detail page). */
  onRowClick?: (row: TransactionRowData) => void
  /**
   * Column header labels (pre-translated). Each overrides the translated
   * default (`transactionsTable.header.*`).
   */
  headers?: {
    date?: ReactNode
    description?: ReactNode
    category?: ReactNode
    account?: ReactNode
    amount?: ReactNode
  }
  /** Empty-state slot (rendered when transactions.length === 0). */
  emptyState?: ReactNode
  /** Optional footer slot (typically a pagination control). */
  footer?: ReactNode
  className?: string
}

/**
 * The icon a category key without a style falls back to. The neutral chip's
 * colours are theme chrome, not data: its tile and chip take
 * `cm.surfaceSecondary` + `cm.textMuted` instead of hardcoded hex.
 */
const NEUTRAL_ICON = 'receipt'

/** Renders a pageable financial transactions table with loading, error, and empty states. */
export function TransactionsTable({
  transactions,
  loading,
  error,
  onRetry,
  retryLabel,
  categoryStyles,
  currency = 'USD',
  formatAmount,
  formatDate,
  onRowClick,
  headers,
  emptyState,
  footer,
  className,
}: TransactionsTableProps): JSX.Element {
  const { t } = useTranslation()
  // Re-renders on a locale switch, so the default formatters re-format at once.
  // An explicit `formatAmount` / `formatDate` prop still wins.
  const activeLocale = useLocale()
  const cm = getClassMap()

  const defaultAmountFormat = (n: number): string =>
    new Intl.NumberFormat(activeLocale, { style: 'currency', currency }).format(Math.abs(n))

  const defaultDateFormat = (d: string | Date): string => {
    if (!d) return ''
    return new Date(d).toLocaleDateString(activeLocale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const amountFormatter = formatAmount ?? defaultAmountFormat
  const dateFormatter = formatDate ?? defaultDateFormat

  if (loading) {
    return (
      <Box
        as="div"
        className={cm.cn(cm.transactionsTableShell, cm.sp('p', 6), className)}
        data-mol-id="transactions-table-loading"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Box
            as="div"
            key={i}
            aria-hidden="true"
            className={cm.cn(cm.transactionsTableSkeletonRow, cm.sp('mb', 3))}
          />
        ))}
      </Box>
    )
  }

  if (error) {
    return (
      <Box
        as="div"
        role="alert"
        className={cm.cn(cm.transactionsTableShell, cm.sp('p', 10), cm.textCenter, className)}
        data-mol-id="transactions-table-error"
      >
        <Text
          as="p"
          className={cm.cn(cm.transactionsTableTertiaryText, cm.textSize('sm'), cm.sp('mb', 3))}
        >
          {error}
        </Text>
        {onRetry ? (
          <Pressable
            as="button"
            type="button"
            data-mol-id="transactions-table-retry"
            onClick={onRetry}
            className={cm.cn(
              cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
              cm.touchTargetCompact,
            )}
          >
            {retryLabel ??
              t('transactionsTable.label.retry', undefined, { defaultValue: 'Try again' })}
          </Pressable>
        ) : null}
      </Box>
    )
  }

  if (transactions.length === 0 && emptyState) {
    return (
      <Box
        as="div"
        className={cm.cn(
          cm.transactionsTableShell,
          cm.sp('p', 12),
          cm.textCenter,
          cm.stack(4),
          className,
        )}
        data-mol-id="transactions-table-empty"
      >
        {emptyState}
      </Box>
    )
  }

  return (
    <Box as="div" className={cm.cn(cm.transactionsTableShell, className)}>
      <Box as="div" className={cm.cn(cm.transactionsTableScroller)}>
        <TableBox as="table" className={cm.cn(cm.w('full'), cm.transactionsTableTable)}>
          <TableBox as="thead">
            <TableBox as="tr" className={cm.cn(cm.transactionsTableHeadRow)}>
              {(
                [
                  {
                    key: 'date',
                    label:
                      headers?.date ??
                      t('transactionsTable.header.date', undefined, { defaultValue: 'Date' }),
                    right: false,
                  },
                  {
                    key: 'description',
                    label:
                      headers?.description ??
                      t('transactionsTable.header.description', undefined, {
                        defaultValue: 'Description',
                      }),
                    right: false,
                  },
                  {
                    key: 'category',
                    label:
                      headers?.category ??
                      t('transactionsTable.header.category', undefined, {
                        defaultValue: 'Category',
                      }),
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
                ] as const
              ).map((h) => (
                <TableCell
                  as="th"
                  key={h.key}
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 5),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    cm.transactionsTableHeaderCell,
                    h.right ? cm.textRight : '',
                  )}
                >
                  {h.label}
                </TableCell>
              ))}
            </TableBox>
          </TableBox>
          <TableBox as="tbody" className={cm.cn(cm.transactionsTableBody)}>
            {transactions.map((tx) => {
              const catKey = tx.categoryKey.toLowerCase()
              // A caller-supplied style is the caller's colour data, applied
              // inline; a key without one falls back to the theme's neutral
              // chip (`cm.surfaceSecondary` + `cm.textMuted`), so no inline
              // colour overrides those classes.
              const catStyle = categoryStyles?.[catKey]
              const neutralChip = !catStyle
              const isIncome = tx.isIncome ?? tx.amount >= 0
              return (
                <TableBox
                  as="tr"
                  key={tx.id}
                  data-mol-id="transactions-table-row"
                  className={cm.cn(onRowClick ? cm.cursorPointer : '', cm.transactionsTableRow)}
                  onClick={onRowClick ? () => onRowClick(tx) : undefined}
                >
                  <TableCell
                    as="td"
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 5),
                      cm.textSize('sm'),
                      cm.transactionsTableDateCell,
                    )}
                  >
                    {dateFormatter(tx.date)}
                  </TableCell>
                  <TableCell as="td" className={cm.cn(cm.sp('px', 6), cm.sp('py', 5))}>
                    <Box
                      as="div"
                      className={cm.cn(
                        cm.flex({ align: 'center' }),
                        cm.transactionsTableDescriptionRow,
                      )}
                    >
                      {/* The tile's fill is layout-neutral (`style`, drawn on every renderer);
                          its glyph colour is paint only the web inherits (`webStyle`). */}
                      <Box
                        as="div"
                        className={cm.cn(
                          cm.w(10),
                          cm.h(10),
                          cm.roundedFull,
                          cm.flex({ align: 'center', justify: 'center' }),
                          neutralChip && [cm.surfaceSecondary, cm.textMuted],
                        )}
                        style={catStyle ? { backgroundColor: catStyle.bg } : undefined}
                        webStyle={catStyle ? { color: catStyle.color } : undefined}
                      >
                        {/* The ligature name is font data, not text; the chip names the category. */}
                        <Text as="span" aria-hidden="true" className={cm.iconGlyphFont}>
                          {catStyle?.icon ?? NEUTRAL_ICON}
                        </Text>
                      </Box>
                      <Text
                        as="span"
                        className={cm.cn(cm.fontWeight('bold'), cm.transactionsTableDescription)}
                      >
                        {tx.description}
                      </Text>
                    </Box>
                  </TableCell>
                  <TableCell as="td" className={cm.cn(cm.sp('px', 6), cm.sp('py', 5))}>
                    <Text
                      as="span"
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        cm.transactionsTableCategoryChip,
                        neutralChip && [cm.surfaceSecondary, cm.textMuted],
                      )}
                      style={
                        catStyle
                          ? { backgroundColor: catStyle.bg, color: catStyle.color }
                          : undefined
                      }
                    >
                      {tx.categoryLabel}
                    </Text>
                  </TableCell>
                  <TableCell
                    as="td"
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 5),
                      cm.textSize('sm'),
                      cm.transactionsTableAccountCell,
                    )}
                  >
                    {tx.account}
                  </TableCell>
                  <TableCell
                    as="td"
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 5),
                      cm.textRight,
                      cm.fontWeight('bold'),
                      cm.transactionsTableAmountCell,
                      isIncome ? cm.textPrimary : cm.transactionsTableTertiaryText,
                    )}
                  >
                    {isIncome ? '+' : '-'}
                    {amountFormatter(tx.amount)}
                  </TableCell>
                </TableBox>
              )
            })}
          </TableBox>
        </TableBox>
        {footer ?? null}
      </Box>
    </Box>
  )
}

export default TransactionsTable
