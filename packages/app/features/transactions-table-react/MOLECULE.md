# @molecule/app-transactions-table-react

`@molecule/app-transactions-table-react` — financial transactions
table primitive.

- Columns: Date / Description (with category icon tile) / Category
  chip / Account / signed Amount (income tinted with the theme's
  `primary` token, expense with `tertiary`).
- Loading skeleton, error state with retry, customisable empty state.
- Stateless about routing: pass `onRowClick` to navigate.
- Localisable: `formatAmount`, `formatDate`, `headers`, `retryLabel`
  and `emptyState` override the en-US/USD/English defaults.

Generalised from the personal-finance TransactionsTable. Works for
any income/expense ledger: subscription billing rows, refund tables,
payout history, etc.

## Quick Start

```tsx
import {
  TransactionsTable,
  type CategoryStyle,
  type TransactionRowData,
} from '@molecule/app-transactions-table-react'

const categoryStyles: Record<string, CategoryStyle> = {
  groceries: { bg: '#d1fae5', color: '#059669', icon: 'shopping_cart' },
  rent: { bg: '#ffe4e6', color: '#e11d48', icon: 'home' },
}

const rows: TransactionRowData[] = [
  {
    id: 't1',
    date: '2026-03-01',
    description: 'Groceries',
    categoryKey: 'groceries',
    categoryLabel: 'Groceries',
    account: 'Checking',
    amount: -54.2,
  },
]

<TransactionsTable
  transactions={rows}
  categoryStyles={categoryStyles}
  onRowClick={(tx) => console.log('open', tx.id)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-transactions-table-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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

#### `TransactionsTableProps`

Props for the {@link TransactionsTable} component.

```typescript
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
```

### Functions

#### `TransactionsTable(props)`

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

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

A custom `formatAmount` receives the SIGNED amount but must return the
absolute formatted value — the component prepends its own +/− sign (the
default already does `Math.abs`). Header labels, `retryLabel` and the
date/amount formats default to English/en-US/USD — pass translated
overrides (`headers`, `retryLabel`) in non-English apps; there is no
companion locale bond. `categoryStyles` keys are matched against the
LOWERCASED `categoryKey`; `icon` is a Material Symbols ligature name, so
the host must load that font. Styling mixes ClassMap with raw Tailwind +
Material-3 tokens (`bg-surface-container-lowest`, `font-headline`,
`text-slate-400/500`), so a Tailwind build source-scanning this package's
dist + an M3 theme are prerequisites, and the slate grays lean
light-theme. Props (documented on the exported `TransactionsTableProps`
interface): transactions, loading, error, onRetry, retryLabel,
categoryStyles, formatAmount, formatDate, onRowClick, headers,
emptyState, footer, className.
