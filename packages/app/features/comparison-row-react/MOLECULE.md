# @molecule/app-comparison-row-react

Period-over-period stat comparison row.

Exports `<ComparisonRow>`.

## Quick Start

```tsx
import { ComparisonRow } from '@molecule/app-comparison-row-react'

<ComparisonRow
  label="Revenue"
  current="$24,800"
  previous="$21,300"
  deltaPct={16.4}
  periodLabel="vs. last month"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-comparison-row-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ComparisonRowProps`

```typescript
interface ComparisonRowProps {
  /** Label for the metric (e.g. "Revenue"). */
  label: ReactNode
  /** Current period value (formatted). */
  current: ReactNode
  /** Previous period value (formatted). */
  previous?: ReactNode
  /** Numeric delta% — drives direction + color when present. */
  deltaPct?: number
  /** Custom delta formatter. */
  formatDelta?: (deltaPct: number) => ReactNode
  /** Optional sub-text ("vs. last week"). */
  periodLabel?: ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `ComparisonRow(props)`

Period-over-period stat comparison row — current value, optional
previous value, and a coloured delta% chip. Used in dashboards,
report summaries, finance overviews.

```typescript
function ComparisonRow({
  label,
  current,
  previous,
  deltaPct,
  formatDelta,
  periodLabel,
  className,
}: ComparisonRowProps): JSX.Element
```

- `props` — Component props (see {@link ComparisonRowProps}).

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

The delta chip colors by SIGN with fixed semantics: positive = green,
negative = red (hardcoded hexes, not theme tokens). There is no
"down-is-good" inversion — for metrics like churn or costs, negate
`deltaPct` (and restate the sign in `formatDelta`, which controls the text
only, never the color). `label` / `current` / `previous` / `periodLabel`
are consumer-provided ReactNodes — pass pre-formatted, translated values.
