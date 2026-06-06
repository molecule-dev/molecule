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
npm install @molecule/app-amount-input-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
