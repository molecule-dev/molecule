# @molecule/app-transactions-table-react

`@molecule/app-transactions-table-react` — financial transactions
table primitive.

- Columns: Date / Description (with category icon tile) / Category
  chip / Account / signed Amount (income green, expense rose).
- Loading skeleton, error state with retry, customisable empty state.
- Stateless about routing: pass `onRowClick` to navigate.
- Localisable: `formatAmount` and `formatDate` props override the
  en-US/USD defaults.

Generalised from the personal-finance TransactionsTable. Works for
any income/expense ledger: subscription billing rows, refund tables,
payout history, etc.

## Quick Start

```tsx
import { TransactionsTable, type CategoryStyle } from '@molecule/app-transactions-table-react'

const categoryStyles: Record<string, CategoryStyle> = {
  groceries: { bg: '#d1fae5', color: '#059669', icon: 'shopping_cart' },
  rent: { bg: '#ffe4e6', color: '#e11d48', icon: 'home' },
}

<TransactionsTable
  transactions={rows.map((tx) => ({
    id: tx.id,
    date: tx.date,
    description: tx.description,
    categoryKey: tx.category_name,
    categoryLabel: tx.category_name,
    account: tx.account_id,
    amount: tx.amount,
    isIncome: tx.type === 'income',
  }))}
  categoryStyles={categoryStyles}
  onRowClick={(tx) => navigate(`/transactions/${tx.id}`)}
  footer={<TransactionPagination />}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-transactions-table-react
```

## API

### Interfaces

#### `CategoryStyle`

Visual treatment for a particular category key.

```typescript
interface CategoryStyle {
  bg: string
  color: string
  icon: string
}
```

#### `TransactionRowData`

Per-row data. Stays minimal so the consumer can fold their domain shape in.

```typescript
interface TransactionRowData {
  id: string
  date: string | Date
  description: ReactNode
  /** Category key (used for the icon + chip styling lookup). */
  categoryKey: string
  categoryLabel: ReactNode
  /** Account name / id rendered in the Account column. */
  account: ReactNode
  /** Signed amount (positive = income, negative = expense) — used for the colour + sign. */
  amount: number
  /** Override sign detection (e.g. when `type` is the canonical signal). */
  isIncome?: boolean
}
```

### Functions

#### `TransactionsTable({
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
})`

Renders a pageable financial transactions table with loading, error, and empty states.

```typescript
function TransactionsTable({
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
}: TransactionsTableProps): JSX.Element
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
