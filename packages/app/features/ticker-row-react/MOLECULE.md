# @molecule/app-ticker-row-react

Financial ticker row — symbol + price + change% + optional sparkline.

Exports `<TickerRow>`.

## Quick Start

```tsx
import { TickerRow } from '@molecule/app-ticker-row-react'

<TickerRow
  symbol="BTC"
  name="Bitcoin"
  price="$67,420"
  changePct={2.34}
  meta="$1.3T"
  onClick={() => router.push('/asset/btc')}
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

### Functions

#### `TickerRow(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .symbol
- `root0` — .name
- `root0` — .icon
- `root0` — .price
- `root0` — .changePct
- `root0` — .changeDisplay
- `root0` — .sparkline
- `root0` — .meta
- `root0` — .onClick
- `root0` — .className

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
