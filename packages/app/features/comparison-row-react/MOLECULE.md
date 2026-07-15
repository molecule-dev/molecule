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

### Functions

#### `ComparisonRow(root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .label
- `root0` — .current
- `root0` — .previous
- `root0` — .deltaPct
- `root0` — .formatDelta
- `root0` — .periodLabel
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
