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

### Types

#### `AmountType`

Transaction type used to categorise an amount entry.

```typescript
type AmountType = 'income' | 'expense' | 'transfer' | 'other'
```

### Functions

#### `AmountInput(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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
  currencySymbol = '$',
  size = 'lg',
  className,
}: AmountInputProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .amount
- `root0` — .onAmountChange
- `root0` — .type
- `root0` — .onTypeChange
- `root0` — .typeOptions
- `root0` — .currencySymbol
- `root0` — .size
- `root0` — .className

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
