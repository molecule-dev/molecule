# @molecule/app-currency-display-react

React currency display and formatting utilities.

Exports:
- `formatCurrency(amount, currency?, locale?)` — plain string via `Intl.NumberFormat`.
- `formatCurrencyCompact(amount, currency?, locale?)` — compact notation (`$12.3K`).
- `<CurrencyDisplay>` — rendered amount with optional strikethrough original price + savings chip.

## Quick Start

```tsx
import { CurrencyDisplay, formatCurrency } from '@molecule/app-currency-display-react'

// Basic amount
<CurrencyDisplay amount={49.99} currency="USD" size="lg" />

// With original price and savings chip
<CurrencyDisplay amount={29.99} originalAmount={49.99} currency="USD" showSavings />

// Compact notation: "$29.99K"
<CurrencyDisplay amount={29990} currency="USD" compact size="xl" />

// Plain string utility
const label = formatCurrency(1234.56, 'EUR', 'de-DE') // "1.234,56 €"
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-currency-display-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `CurrencyDisplayProps`

```typescript
interface CurrencyDisplayProps {
  /** Current amount in major units. */
  amount: number
  /** Optional original amount — rendered strikethrough to show a discount. */
  originalAmount?: number
  /** ISO 4217 currency code. */
  currency?: string
  /** Locale override. */
  locale?: string
  /** Display size. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Compact notation (`$12.3K`) instead of full. */
  compact?: boolean
  /** Show a savings chip when `originalAmount > amount`. */
  showSavings?: boolean
  /** Custom savings label renderer. */
  savingsLabel?: (saved: number, pct: number) => string
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `CurrencyDisplay(props)`

Display a monetary amount with optional original price (strikethrough)
and a "saved X%" chip. Uses `Intl.NumberFormat` under the hood.

Use the `formatCurrency` / `formatCurrencyCompact` utilities directly
when you just need a string without rendering chrome.

```typescript
function CurrencyDisplay({
  amount,
  originalAmount,
  currency = 'USD',
  locale,
  size = 'md',
  compact,
  showSavings = true,
  savingsLabel,
  className,
}: CurrencyDisplayProps): JSX.Element
```

- `props` — Component props (see {@link CurrencyDisplayProps}).

#### `formatCurrency(amount, currency, locale)`

Formats a numeric amount as currency using `Intl.NumberFormat`.

```typescript
function formatCurrency(amount: number, currency?: string, locale?: string): string
```

- `amount` — Amount in major units (e.g. dollars, not cents). Pass `amount / 100` if your stored value is in cents.
- `currency` — ISO 4217 currency code. Defaults to `"USD"`.
- `locale` — BCP 47 locale tag. Defaults to the runtime default (`undefined`).

**Returns:** Formatted currency string.

#### `formatCurrencyCompact(amount, currency, locale)`

Formats a numeric amount as currency in a compact form (e.g. "$12.3K").
Uses `Intl.NumberFormat` with `notation: 'compact'` when supported.

```typescript
function formatCurrencyCompact(amount: number, currency?: string, locale?: string): string
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

Amounts are in MAJOR units (dollars, not cents) — divide stored cents by
100 first. `showSavings` defaults to true, so a savings chip appears
whenever `originalAmount > amount`; pass `showSavings={false}` for plain
was/now price display. Formatting is `Intl.NumberFormat` (locale-aware,
no i18n keys needed); `savingsLabel(saved, pct)` lets you localize the
chip text.
