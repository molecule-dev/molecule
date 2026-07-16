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

### Interfaces

#### `TrendChipProps`

Props for the {@link TrendChip} component.

```typescript
interface TrendChipProps {
  /** Numeric delta to display. Sign drives direction unless `direction` is set. */
  delta: number
  /** Explicit direction override. */
  direction?: 'up' | 'down' | 'flat'
  /** Suffix appended to the delta. Defaults to '%'. */
  suffix?: string
  /** Optional prefix for the value. */
  prefix?: ReactNode
  /** Style preset. `'subtle'` = inline plain, `'pill'` = colored pill. Defaults to `'subtle'`. */
  variant?: 'subtle' | 'pill'
  /** Optional accessible label override. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `TrendChip(props)`

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

- `props` — Component props (see {@link TrendChipProps}).

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

Colors are hardcoded hex applied inline (`#22c55e` up, `#ef4444` down,
`#94a3b8` flat) — they ignore the app theme and ClassMap; `pill` renders
white text on that background. Up is always green / down always red:
there is no inversion knob for metrics where a drop is good (costs,
churn). The number renders as `Math.abs(delta)` + `suffix` ('%' by
default) — the sign only picks the arrow; `direction` overrides
sign-detection. Props (documented on the exported `TrendChipProps`
interface): delta, direction ('up' | 'down' | 'flat'), suffix, prefix,
variant ('subtle' | 'pill'), ariaLabel, className. No data-mol-id prop.
