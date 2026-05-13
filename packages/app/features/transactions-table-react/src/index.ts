/**
 * `@molecule/app-transactions-table-react` — financial transactions
 * table primitive.
 *
 * - Columns: Date / Description (with category icon tile) / Category
 *   chip / Account / signed Amount (income green, expense rose).
 * - Loading skeleton, error state with retry, customisable empty state.
 * - Stateless about routing: pass `onRowClick` to navigate.
 * - Localisable: `formatAmount` and `formatDate` props override the
 *   en-US/USD defaults.
 *
 * Generalised from the personal-finance TransactionsTable. Works for
 * any income/expense ledger: subscription billing rows, refund tables,
 * payout history, etc.
 *
 * @example
 * ```tsx
 * import { TransactionsTable, type CategoryStyle } from '@molecule/app-transactions-table-react'
 *
 * const categoryStyles: Record<string, CategoryStyle> = {
 *   groceries: { bg: '#d1fae5', color: '#059669', icon: 'shopping_cart' },
 *   rent: { bg: '#ffe4e6', color: '#e11d48', icon: 'home' },
 * }
 *
 * <TransactionsTable
 *   transactions={rows.map((tx) => ({
 *     id: tx.id,
 *     date: tx.date,
 *     description: tx.description,
 *     categoryKey: tx.category_name,
 *     categoryLabel: tx.category_name,
 *     account: tx.account_id,
 *     amount: tx.amount,
 *     isIncome: tx.type === 'income',
 *   }))}
 *   categoryStyles={categoryStyles}
 *   onRowClick={(tx) => navigate(`/transactions/${tx.id}`)}
 *   footer={<TransactionPagination />}
 * />
 * ```
 *
 * @module
 */

export * from './TransactionsTable.js'
export * from './types.js'
