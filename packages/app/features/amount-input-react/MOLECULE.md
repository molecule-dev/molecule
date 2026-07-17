# @molecule/app-amount-input-react

React amount input with type toggle.

Exports:
- `<AmountInput>` — large currency input with income/expense toggle.
- `AmountType` — `'income' | 'expense' | 'transfer' | 'other'`.
- `formatCurrency` — convenience re-export.

## Quick Start

```tsx
import { AmountInput } from '@molecule/app-amount-input-react'

const [amount, setAmount] = useState<number | ''>(0)
const [type, setType] = useState<'income' | 'expense'>('expense')

<AmountInput
  amount={amount}
  onAmountChange={setAmount}
  type={type}
  onTypeChange={(t) => setType(t as 'income' | 'expense')}
  currencySymbol="$"
  size="lg"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-amount-input-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `AmountInputProps`

```typescript
interface AmountInputProps {
  /** Current numeric amount (major units). */
  amount: number | ''
  /** Called whenever the amount text changes. */
  onAmountChange: (amount: number | '') => void
  /** Optional type (income/expense/transfer) toggle. */
  type?: AmountType
  /** Called when the user changes the type. When omitted, the toggle is hidden. */
  onTypeChange?: (type: AmountType) => void
  /** Type options to show in the toggle. Defaults to `['income', 'expense']`. */
  typeOptions?: AmountType[]
  /**
   * Optional per-type label overrides. A value provided for a type wins over
   * the translated / `defaultValue` label (prop > `t()` > default), letting a
   * consumer relabel the toggle without wiring a locale bond.
   */
  typeLabels?: Partial<Record<AmountType, string>>
  /** Currency symbol or label rendered to the left of the input. Defaults to `'$'`. */
  currencySymbol?: string
  /**
   * Accessible label for the numeric input. Overrides the translated /
   * `defaultValue` `'Amount'` (prop > `t()` > default).
   */
  ariaLabel?: string
  /** Input size. */
  size?: 'md' | 'lg' | 'xl'
  /** Extra classes. */
  className?: string
}
```

### Types

#### `AmountType`

Transaction type used to categorise an amount entry.

```typescript
type AmountType = 'income' | 'expense' | 'transfer' | 'other'
```

### Functions

#### `AmountInput(props)`

Large transaction-style amount input with optional type toggle +
currency symbol. Common in budgeting, expense-reporting, and
financial-form UX.

```typescript
function AmountInput({
  amount,
  onAmountChange,
  type,
  onTypeChange,
  typeOptions = ['income', 'expense'],
  typeLabels,
  currencySymbol = '$',
  ariaLabel,
  size = 'lg',
  className,
}: AmountInputProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see {@link AmountInputProps}).

#### `formatCurrency(amount, currency, locale)`

Formats a numeric amount as a localized currency string.

```typescript
function formatCurrency(amount: number, currency?: string, locale?: string): string
```

- `amount` — *
- `currency` — *

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

All user-facing text flows through `t()` with English `defaultValue`
fallbacks under the `amountInput.*` keys, so a wired locale bond (or the
host app's own locale) can translate the type-toggle labels and the input's
accessible name. Both are also overridable per-instance without a bond: the
`typeLabels` prop relabels the toggle and `ariaLabel` sets the input's
accessible name (prop > `t()` > default).
