# @molecule/app-currency-display-react

React currency display and formatting utilities.

Exports:
- `formatCurrency(amount, currency?, locale?)` — plain string via `Intl.NumberFormat`.
- `formatCurrencyCompact(amount, currency?, locale?)` — compact notation (`$12.3K`).
- `<CurrencyDisplay>` — rendered amount with optional strikethrough original price + savings chip.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-currency-display-react
```

## API

### Functions

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
