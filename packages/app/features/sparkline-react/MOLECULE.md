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
npm install @molecule/app-sparkline-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `Sparkline(root0, root0, root0, root0, root0, root0, root0, root0)`

Tiny inline trend chart — line, bar, or dot variants. Uses SVG with
no external library so it works inside cards, table cells, KPI tiles,
etc. without a chart bond.

```typescript
function Sparkline({
  values,
  variant = 'line',
  width = 80,
  height = 24,
  color = 'currentColor',
  ariaLabel,
  className,
}: SparklineProps): ReactElement<unknown, string | JSXElementConstructor<any>> | null
```

- `root0` — *
- `root0` — .values
- `root0` — .variant
- `root0` — .width
- `root0` — .height
- `root0` — .color
- `root0` — .ariaLabel
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
