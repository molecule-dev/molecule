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

### Interfaces

#### `SparklineProps`

Props for the {@link Sparkline} component.

```typescript
interface SparklineProps {
  /** Numeric series — length determines the segment count. */
  values: number[]
  /** Visual variant. */
  variant?: 'line' | 'bar' | 'dot'
  /** SVG width in px. Defaults to 80. */
  width?: number
  /** SVG height in px. Defaults to 24. */
  height?: number
  /** Stroke / fill color. Defaults to currentColor. */
  color?: string
  /** Optional accessible label. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `Sparkline(props)`

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

- `props` — Component props (see {@link SparklineProps}).

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
  bonding); no i18n dependency.
- The SVG is fixed-pixel (`width`/`height` props, defaults 80×24) —
  it does not stretch to its container. Compute px from layout if you
  need responsiveness.
- `color` accepts any CSS color and defaults to `currentColor`, so the
  sparkline inherits the surrounding text color — set a text color on
  a parent (e.g. success/error) to theme it.
- Values are min-max normalized per series; a constant series renders
  as a line along the bottom edge, and `values={[]}` renders nothing.
- Pass `ariaLabel` with a translated string — the built-in fallback
  ("Trend sparkline") is English-only.
