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

import { getClassMap } from '@molecule/app-ui'

import type { CategoryStyle, TransactionRowData } from './types.js'

interface TransactionsTableProps {
  transactions: TransactionRowData[]
  loading?: boolean
  error?: ReactNode
  onRetry?: () => void
  retryLabel?: ReactNode
  /** Map a category key (lowercased automatically) to a style; falls back to neutral grey. */
  categoryStyles?: Record<string, CategoryStyle>
  /** Localised currency formatter; defaults to en-US USD. */
  formatAmount?: (amount: number) => string
  /** Localised date formatter; defaults to "MMM d, yyyy". */
  formatDate?: (date: string | Date) => string
  /** Click handler for each row (typically navigates to a detail page). */
  onRowClick?: (row: TransactionRowData) => void
  /** Column header labels (pre-translated). */
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

const NEUTRAL_STYLE: CategoryStyle = { bg: '#f3f4f6', color: '#374151', icon: 'receipt' }

const DEFAULT_AMOUNT_FORMAT = (n: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(n))

const DEFAULT_DATE_FORMAT = (d: string | Date): string => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Renders a pageable financial transactions table with loading, error, and empty states. */
export function TransactionsTable({
  transactions,
  loading,
  error,
  onRetry,
  retryLabel = 'Try again',
  categoryStyles,
  formatAmount = DEFAULT_AMOUNT_FORMAT,
  formatDate = DEFAULT_DATE_FORMAT,
  onRowClick,
  headers,
  emptyState,
  footer,
  className,
}: TransactionsTableProps): JSX.Element {
  const cm = getClassMap()

  if (loading) {
    return (
      <div
        className={cm.cn(
          'bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm',
          cm.sp('p', 6),
          className,
        )}
        data-mol-id="transactions-table-loading"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={cm.cn(
              'h-12 bg-surface-container-low rounded-lg animate-pulse',
              cm.sp('mb', 3),
            )}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        className={cm.cn(
          'bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm',
          cm.sp('p', 10),
          cm.textCenter,
          className,
        )}
        data-mol-id="transactions-table-error"
      >
        <p className={cm.cn('text-tertiary', cm.textSize('sm'), cm.sp('mb', 3))}>{error}</p>
        {onRetry ? (
          <button
            onClick={onRetry}
            className={cm.cn(
              cm.sp('px', 4),
              cm.sp('py', 2),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'bg-primary text-on-primary rounded-lg',
            )}
          >
            {retryLabel}
          </button>
        ) : null}
      </div>
    )
  }

  if (transactions.length === 0 && emptyState) {
    return (
      <div
        className={cm.cn(
          'bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm',
          cm.sp('p', 12),
          cm.textCenter,
          cm.stack(4),
          className,
        )}
        data-mol-id="transactions-table-empty"
      >
        {emptyState}
      </div>
    )
  }

  return (
    <div
      className={cm.cn(
        'bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm',
        className,
      )}
    >
      <div className={cm.cn('overflow-x-auto')}>
        <table className={cm.cn(cm.w('full'), 'text-left border-collapse')}>
          <thead>
            <tr className={cm.cn('bg-surface-container-low/50 border-none')}>
              {(
                [
                  { key: 'date', label: headers?.date ?? 'Date', right: false },
                  {
                    key: 'description',
                    label: headers?.description ?? 'Description',
                    right: false,
                  },
                  { key: 'category', label: headers?.category ?? 'Category', right: false },
                  { key: 'account', label: headers?.account ?? 'Account', right: false },
                  { key: 'amount', label: headers?.amount ?? 'Amount', right: true },
                ] as const
              ).map((h) => (
                <th
                  key={h.key}
                  className={cm.cn(
                    cm.sp('px', 6),
                    cm.sp('py', 5),
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'font-headline uppercase tracking-widest text-slate-400',
                    h.right ? cm.textRight : '',
                  )}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cm.cn('divide-y divide-transparent')}>
            {transactions.map((tx) => {
              const catKey = tx.categoryKey.toLowerCase()
              const catStyle = categoryStyles?.[catKey] ?? NEUTRAL_STYLE
              const isIncome = tx.isIncome ?? tx.amount >= 0
              return (
                <tr
                  key={tx.id}
                  data-mol-id="transactions-table-row"
                  className={cm.cn(
                    onRowClick ? cm.cursorPointer : '',
                    'group hover:bg-surface-container-low transition-colors duration-200',
                  )}
                  onClick={onRowClick ? () => onRowClick(tx) : undefined}
                >
                  <td
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 5),
                      cm.textSize('sm'),
                      'text-slate-500',
                    )}
                  >
                    {formatDate(tx.date)}
                  </td>
                  <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 5))}>
                    <div className={cm.cn(cm.flex({ align: 'center' }), 'gap-3')}>
                      <div
                        className={cm.cn(
                          cm.w(10),
                          cm.h(10),
                          cm.roundedFull,
                          cm.flex({ align: 'center', justify: 'center' }),
                        )}
                        style={{ backgroundColor: catStyle.bg, color: catStyle.color }}
                      >
                        <span className={cm.cn('material-symbols-outlined')}>{catStyle.icon}</span>
                      </div>
                      <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
                        {tx.description}
                      </span>
                    </div>
                  </td>
                  <td className={cm.cn(cm.sp('px', 6), cm.sp('py', 5))}>
                    <span
                      className={cm.cn(
                        cm.sp('px', 3),
                        cm.sp('py', 1),
                        cm.fontWeight('bold'),
                        cm.roundedFull,
                        'text-[10px] uppercase tracking-wider',
                      )}
                      style={{ backgroundColor: catStyle.bg, color: catStyle.color }}
                    >
                      {tx.categoryLabel}
                    </span>
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 5),
                      cm.textSize('sm'),
                      'text-slate-500 italic',
                    )}
                  >
                    {tx.account}
                  </td>
                  <td
                    className={cm.cn(
                      cm.sp('px', 6),
                      cm.sp('py', 5),
                      cm.textRight,
                      cm.fontWeight('bold'),
                      'font-headline',
                      isIncome ? 'text-primary' : 'text-tertiary',
                    )}
                  >
                    {isIncome ? '+' : '-'}
                    {formatAmount(tx.amount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {footer ?? null}
      </div>
    </div>
  )
}

export default TransactionsTable
