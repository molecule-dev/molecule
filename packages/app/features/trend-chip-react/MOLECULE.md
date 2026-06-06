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
npm install @molecule/app-trend-chip-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
