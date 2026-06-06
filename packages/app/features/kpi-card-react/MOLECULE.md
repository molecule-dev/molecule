# @molecule/app-kpi-card-react

React KPI / metric card primitives.

Exports:
- `<KpiCard>` — single metric card with title/value/subtitle/icon/trend/action slots.
- `<KpiCardTrend>` — arrow + delta% component for the trend slot.
- `<KpiCardGrid>` — responsive grid container for KPI cards.

## Quick Start

```tsx
import { KpiCard, KpiCardGrid, KpiCardTrend } from '@molecule/app-kpi-card-react'

<KpiCardGrid columns={3}>
  <KpiCard
    title="Monthly Revenue"
    value="$48,200"
    trend={<KpiCardTrend delta={12.4} />}
    accentSide="top"
    upperLabel
    emphasizeValue
    hoverLift
    dataMolId="kpi-revenue"
  />
</KpiCardGrid>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-kpi-card-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
