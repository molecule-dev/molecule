# @molecule/app-sparkline-react

Tiny inline trend chart — line/bar/dot variants, SVG only, no library dep.

Exports `<Sparkline>`.

## Quick Start

```tsx
import { Sparkline } from '@molecule/app-sparkline-react'

<Sparkline
  values={[12, 18, 15, 22, 30, 27, 35]}
  variant="line"
  width={80}
  height={24}
  ariaLabel="Weekly revenue trend"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-sparkline-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
