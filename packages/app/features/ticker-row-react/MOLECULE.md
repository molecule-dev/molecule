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
npm install @molecule/app-ticker-row-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
