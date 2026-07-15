# @molecule/app-trend-chip-react

Standalone trend delta chip (▲ 12%).

Exports `<TrendChip>`.

## Quick Start

```tsx
import { TrendChip } from '@molecule/app-trend-chip-react'

// Subtle inline (default)
<TrendChip delta={12} />

// Colored pill, negative delta
<TrendChip delta={-4.5} suffix="%" variant="pill" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-trend-chip-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `TrendChip(root0, root0, root0, root0, root0, root0, root0, root0)`

Standalone trend delta chip — `▲ 12%` style display for inline
placement in row/header/cell contexts. Different from
`<KpiCardTrend>` in being usable outside of a KPI card.

```typescript
function TrendChip({
  delta,
  direction,
  suffix = '%',
  prefix,
  variant = 'subtle',
  ariaLabel,
  className,
}: TrendChipProps): React.JSX.Element
```

- `root0` — *
- `root0` — .delta
- `root0` — .direction
- `root0` — .suffix
- `root0` — .prefix
- `root0` — .variant
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
