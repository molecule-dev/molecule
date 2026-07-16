# @molecule/app-ticker-row-react

Financial ticker row — symbol + price + change% + optional sparkline.

Exports `<TickerRow>`. Use for crypto trackers, stock watchlists,
market dashboards. Pair the `sparkline` slot with
`<Sparkline values={...} />` from `@molecule/app-sparkline-react`.

## Quick Start

```tsx
import { TickerRow } from '@molecule/app-ticker-row-react'

declare function openAsset(id: string): void

<TickerRow
  symbol="BTC"
  name="Bitcoin"
  price="$67,420"
  changePct={2.34}
  meta="$1.3T"
  onClick={() => openAsset('btc')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-ticker-row-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `TickerRowProps`

Props for the {@link TickerRow} component.

```typescript
interface TickerRowProps {
  /** Symbol / ticker display ("BTC", "AAPL"). */
  symbol: ReactNode
  /** Full name display ("Bitcoin", "Apple Inc."). */
  name?: ReactNode
  /** Optional leading icon / logo. */
  icon?: ReactNode
  /** Current price (formatted string). */
  price: ReactNode
  /** Period change percentage. Used for direction + color. */
  changePct?: number
  /** Period change formatted display (defaults to `changePct` formatted). */
  changeDisplay?: ReactNode
  /** Optional sparkline node (pass `<Sparkline values={...} />` from `app-sparkline-react`). */
  sparkline?: ReactNode
  /** Optional volume / market-cap display. */
  meta?: ReactNode
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `TickerRow(props)`

Financial ticker row — symbol + price + change% + optional sparkline.
Use for crypto trackers, stock watchlists, market dashboards.

```typescript
function TickerRow({
  symbol,
  name,
  icon,
  price,
  changePct,
  changeDisplay,
  sparkline,
  meta,
  onClick,
  className,
}: TickerRowProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see {@link TickerRowProps}).

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

- Requires a wired ClassMap bond (`getClassMap()` throws before
  bonding). `price`/`meta` are opaque display nodes — the app owns
  number/currency formatting.
- `changePct` drives direction (▲/▼/–) and a FIXED green/red hex
  color applied inline — it does not follow theme success/error
  tokens. Pass `changeDisplay` to control the change text; the
  default is `changePct` to 2 decimals with a percent sign.
- With `onClick` the row becomes a clickable div WITHOUT button
  semantics — wrap it in your own button/link (or add key handling)
  where keyboard access matters.
