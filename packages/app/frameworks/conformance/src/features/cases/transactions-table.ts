/**
 * `@molecule/app-transactions-table-react` cases: the financial transactions
 * table — Date / Description (category icon tile) / Category chip / Account /
 * signed Amount columns, plus the loading skeleton, the error state with its
 * retry button, the empty state and the optional footer.
 *
 * Every export is the one component (`TransactionsTable`); its props carry the
 * rows, the category styles, the formatters, the header labels and the four
 * node-valued branches (`error`, `retryLabel`, `emptyState`, `footer`), which
 * arrive as nodes inside `props` exactly as a caller passes an element. The
 * component reads no app services; its own text (the column headers and the
 * retry label) goes through `t()` with English `defaultValue`s, so the cases
 * mount under the UI providers only and the derived locale-switch case sees
 * that text bracketed.
 *
 * Dates are local midnights (`2026-03-01T00:00:00`, no `Z`), so the default
 * `toLocaleDateString` formatter names the same day in every time zone the
 * goldens are compared in.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** An expense row: negative amount, uppercased category key (the lookup lowercases it). */
const groceries = {
  id: 't1',
  date: '2026-03-01T00:00:00',
  description: 'Groceries',
  categoryKey: 'Groceries',
  categoryLabel: 'Groceries',
  account: 'Checking',
  amount: -54.2,
}

/** An income row: positive amount, so the sign and the colour come from the amount. */
const salary = {
  id: 't2',
  date: '2026-03-02T00:00:00',
  description: 'Salary',
  categoryKey: 'income',
  categoryLabel: 'Income',
  account: 'Savings',
  amount: 2450,
}

/** A second expense row, for the list-replacement cases. */
const coffee = {
  id: 't3',
  date: '2026-03-03T00:00:00',
  description: 'Coffee',
  categoryKey: 'dining',
  categoryLabel: 'Dining',
  account: 'Credit card',
  amount: 4.75,
}

/** Two category styles; any other category key falls back to React's neutral grey. */
const categoryStyles = {
  groceries: { bg: '#d1fae5', color: '#059669', icon: 'shopping_cart' },
  income: { bg: '#dbeafe', color: '#2563eb', icon: 'payments' },
}

/** The custom amount formatter, receiving the signed amount. */
const customAmount = { $fn: 'formatAmount', format: 'USD {0}' }

/** The custom date formatter, receiving the row's `date`. */
const customDate = { $fn: 'formatDate', format: 'on {0}' }

/** The empty state, the way a caller fills it. */
const emptyState = [{ tag: 'p', attrs: { 'data-empty': '' }, children: ['No transactions yet.'] }]

/** The error message node. */
const errorNode = [{ tag: 'span', attrs: { 'data-error': '' }, children: ['Could not load'] }]

/** A footer node, typically a pagination control. */
const footer = [
  { tag: 'nav', attrs: { 'data-footer': '', 'aria-label': 'Pagination' }, children: ['1 of 3'] },
]

/** One row whose display fields are nodes, the way a caller passes rich markup. */
const nodeRow = {
  id: 'n1',
  date: '2026-03-04T00:00:00',
  description: { $nodes: [{ tag: 'strong', children: ['Rent'] }] },
  categoryKey: 'housing',
  categoryLabel: { $nodes: [{ tag: 'em', children: ['Housing'] }] },
  account: { $nodes: [{ tag: 'code', children: ['CHK-1'] }] },
  amount: -1200,
}

/** `@molecule/app-transactions-table-react`. */
export const transactionsTableFeature: FeatureCases = {
  package: '@molecule/app-transactions-table-react',
  families: [
    {
      component: 'TransactionsTable',
      cases: [
        // Defaults: default header labels, default formatters in the app's
        // active locale (the amount in USD), no footer.
        { name: 'two rows with the defaults', props: { transactions: [groceries, salary] } },

        // Every row branch: expense sign, income sign, neutral category fallback.
        {
          name: 'income, expense and the neutral category fallback',
          props: { transactions: [groceries, salary, coffee] },
        },

        // `isIncome` overrides the amount's sign.
        {
          name: 'an explicit isIncome overrides the sign',
          props: {
            transactions: [
              { ...coffee, id: 'x1', amount: 50, isIncome: false },
              { ...coffee, id: 'x2', amount: -50, isIncome: true },
            ],
          },
        },

        // `categoryStyles`, matched against the lowercased `categoryKey`.
        {
          name: 'category styles and the neutral fallback',
          props: { transactions: [groceries, salary, coffee], categoryStyles },
        },

        // `emptyState` branches.
        {
          name: 'empty transactions render the table without rows',
          props: { transactions: [] },
        },
        {
          name: 'an empty state node',
          props: { transactions: [], emptyState: { $nodes: emptyState } },
        },
        {
          name: 'a plain-text empty state with classes',
          props: { transactions: [], emptyState: 'Nothing here yet', className: 'parity-token' },
        },

        // `loading` branches.
        {
          name: 'the loading skeleton',
          props: { transactions: [groceries], loading: true },
        },
        {
          name: 'loading wins over rows, an error and the empty state',
          props: {
            transactions: [],
            loading: true,
            error: { $nodes: errorNode },
            emptyState: { $nodes: emptyState },
          },
        },

        // `error` branches: with and without a retry handler, default and custom labels.
        {
          name: 'an error state with the default retry label',
          props: { transactions: [groceries], error: { $nodes: errorNode } },
          callbacks: ['onRetry'],
          interactions: [{ type: 'click', selector: '[data-mol-id="transactions-table-retry"]' }],
        },
        {
          name: 'a plain-text error without a retry handler',
          props: { transactions: [groceries], error: 'Could not load transactions' },
          interactions: [{ type: 'click', selector: '[role="alert"] p' }],
        },
        {
          name: 'an error wins over the empty state',
          props: {
            transactions: [],
            error: { $nodes: errorNode },
            emptyState: { $nodes: emptyState },
          },
        },
        {
          name: 'a custom retry label',
          props: { transactions: [groceries], error: 'Oops', retryLabel: 'Reload' },
          callbacks: ['onRetry'],
          interactions: [{ type: 'click', selector: '[data-mol-id="transactions-table-retry"]' }],
        },
        {
          name: 'a node retry label',
          props: {
            transactions: [groceries],
            error: 'Oops',
            retryLabel: { $nodes: [{ tag: 'strong', children: ['Again'] }] },
          },
          callbacks: ['onRetry'],
        },

        // `headers`: plain labels, then node labels, then a later change.
        {
          name: 'custom header labels',
          props: {
            transactions: [groceries],
            headers: {
              date: 'When',
              description: 'Memo',
              category: 'Kind',
              account: 'Wallet',
              amount: 'Sum',
            },
          },
        },
        {
          name: 'node header labels',
          props: {
            transactions: [groceries],
            headers: {
              date: { $nodes: [{ tag: 'strong', children: ['When'] }] },
              amount: { $nodes: [{ tag: 'em', children: ['Sum'] }] },
            },
          },
        },
        {
          name: 'a header label changes on a props change',
          props: { transactions: [groceries], headers: { amount: 'Sum' } },
          interactions: [{ type: 'props', props: { headers: { amount: 'Total' } } }],
        },

        // Custom formatters (`formatAmount` receives the signed amount).
        {
          name: 'custom amount and date formatters',
          props: {
            transactions: [groceries, salary],
            formatAmount: customAmount,
            formatDate: customDate,
          },
        },

        // Node-valued row fields.
        { name: 'node row fields', props: { transactions: [nodeRow] } },

        // `className` on the table shell.
        {
          name: 'className on the table shell',
          props: { transactions: [groceries], className: 'parity-token' },
        },

        // `footer`, rendered inside the scroller after the table.
        {
          name: 'a footer node',
          props: { transactions: [groceries], footer: { $nodes: footer } },
        },

        // `onRowClick` callbacks.
        {
          name: 'row clicks call onRowClick with the row',
          props: { transactions: [groceries, salary] },
          callbacks: ['onRowClick'],
          interactions: [
            { type: 'click', selector: 'tbody tr:nth-child(1)' },
            { type: 'click', selector: 'tbody tr:nth-child(2)' },
          ],
        },
        {
          name: 'a row click without a handler calls nothing',
          props: { transactions: [groceries] },
          interactions: [{ type: 'click', selector: 'tbody tr:nth-child(1)' }],
        },

        // Prop changes across every branch.
        {
          name: 'loading toggles on and off',
          props: { transactions: [groceries] },
          interactions: [
            { type: 'props', props: { loading: true } },
            { type: 'props', props: { loading: false } },
          ],
        },
        {
          name: 'the rows are replaced on a props change',
          props: { transactions: [groceries] },
          interactions: [{ type: 'props', props: { transactions: [coffee, salary] } }],
        },
        {
          name: 'an error arrives and clears',
          props: { transactions: [groceries] },
          interactions: [
            { type: 'props', props: { error: 'Boom' } },
            { type: 'props', props: { error: undefined } },
          ],
        },
        {
          name: 'the empty state appears when the rows empty',
          props: { transactions: [groceries], emptyState: 'Nothing here yet' },
          interactions: [{ type: 'props', props: { transactions: [] } }],
        },
      ],
    },
  ],
}
