/**
 * Types for the Solid transactions table.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Per-row data. Stays minimal so the consumer can fold their domain shape in. */
export interface TransactionRowData {
  id: string
  date: string | Date
  /** The description cell (React's `ReactNode`: any Solid JSX element). */
  description: JSX.Element
  /** Category key (used for the icon + chip styling lookup). */
  categoryKey: string
  categoryLabel: JSX.Element
  /** Account name / id rendered in the Account column. */
  account: JSX.Element
  /** Signed amount (positive = income, negative = expense) — used for the colour + sign. */
  amount: number
  /** Override sign detection (e.g. when `type` is the canonical signal). */
  isIncome?: boolean
}

/** Visual treatment for a particular category key. */
export interface CategoryStyle {
  bg: string
  color: string
  icon: string
}

/** Props for the {@link TransactionsTable} component. */
export interface TransactionsTableProps {
  /** The rows to render. */
  transactions: TransactionRowData[]
  /** When true, renders six skeleton rows instead of the table. */
  loading?: boolean
  /** Error message node. */
  error?: JSX.Element
  /** Retry handler rendered as a button in the error state. */
  onRetry?: () => void
  /**
   * Label of the retry button. Overrides the translated default
   * (`transactionsTable.label.retry`, English `'Try again'`).
   */
  retryLabel?: JSX.Element
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
  /** Click handler for each row (the row is the only argument, as in React). */
  onRowClick?: (row: TransactionRowData) => void
  /**
   * Column header labels (pre-translated). Each overrides the translated
   * default (`transactionsTable.header.*`).
   */
  headers?: {
    date?: JSX.Element
    description?: JSX.Element
    category?: JSX.Element
    account?: JSX.Element
    amount?: JSX.Element
  }
  /** Empty-state slot (rendered when transactions.length === 0). */
  emptyState?: JSX.Element
  /** Optional footer slot (typically a pagination control). */
  footer?: JSX.Element
  /** Extra classes on the outer shell. */
  className?: string
}
