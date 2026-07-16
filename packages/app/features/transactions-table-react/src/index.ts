/**
 * `@molecule/app-transactions-table-react` — financial transactions
 * table primitive.
 *
 * - Columns: Date / Description (with category icon tile) / Category
 *   chip / Account / signed Amount (income tinted with the theme's
 *   `primary` token, expense with `tertiary`).
 * - Loading skeleton, error state with retry, customisable empty state.
 * - Stateless about routing: pass `onRowClick` to navigate.
 * - Localisable: `formatAmount`, `formatDate`, `headers`, `retryLabel`
 *   and `emptyState` override the en-US/USD/English defaults.
 *
 * Generalised from the personal-finance TransactionsTable. Works for
 * any income/expense ledger: subscription billing rows, refund tables,
 * payout history, etc.
 *
 * @example
 * ```tsx
 * import {
 *   TransactionsTable,
 *   type CategoryStyle,
 *   type TransactionRowData,
 * } from '@molecule/app-transactions-table-react'
 *
 * const categoryStyles: Record<string, CategoryStyle> = {
 *   groceries: { bg: '#d1fae5', color: '#059669', icon: 'shopping_cart' },
 *   rent: { bg: '#ffe4e6', color: '#e11d48', icon: 'home' },
 * }
 *
 * const rows: TransactionRowData[] = [
 *   {
 *     id: 't1',
 *     date: '2026-03-01',
 *     description: 'Groceries',
 *     categoryKey: 'groceries',
 *     categoryLabel: 'Groceries',
 *     account: 'Checking',
 *     amount: -54.2,
 *   },
 * ]
 *
 * <TransactionsTable
 *   transactions={rows}
 *   categoryStyles={categoryStyles}
 *   onRowClick={(tx) => console.log('open', tx.id)}
 * />
 * ```
 *
 * @remarks
 * A custom `formatAmount` receives the SIGNED amount but must return the
 * absolute formatted value — the component prepends its own +/− sign (the
 * default already does `Math.abs`). Header labels, `retryLabel` and the
 * date/amount formats default to English/en-US/USD — pass translated
 * overrides (`headers`, `retryLabel`) in non-English apps; there is no
 * companion locale bond. `categoryStyles` keys are matched against the
 * LOWERCASED `categoryKey`; `icon` is a Material Symbols ligature name, so
 * the host must load that font. Styling mixes ClassMap with raw Tailwind +
 * Material-3 tokens (`bg-surface-container-lowest`, `font-headline`,
 * `text-slate-400/500`), so a Tailwind build source-scanning this package's
 * dist + an M3 theme are prerequisites, and the slate grays lean
 * light-theme. Props (documented on the exported `TransactionsTableProps`
 * interface): transactions, loading, error, onRetry, retryLabel,
 * categoryStyles, formatAmount, formatDate, onRowClick, headers,
 * emptyState, footer, className.
 *
 * @module
 */

export * from './TransactionsTable.js'
export * from './types.js'
