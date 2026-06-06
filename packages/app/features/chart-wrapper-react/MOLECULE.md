# @molecule/app-chart-wrapper-react

React ChartCard + ChartLegend wrappers around @molecule/app-charts.

Exports:
- `<ChartCard>` — uniform chrome (title / description / actions / summary /
  body / footer) around a chart rendering.
- `<ChartLegend>` — swatch + label (+ value) legend with optional toggle.
- `ChartLegendItem` type.

The chart library itself comes from the `@molecule/app-charts` bond;
these wrappers only provide surrounding chrome.

## Quick Start

```tsx
import { ChartCard, ChartLegend } from '@molecule/app-chart-wrapper-react'

<ChartCard
  title="Monthly Revenue"
  description="Last 12 months"
  actions={<RangePicker />}
  footer={
    <ChartLegend
      items={[
        { id: 'revenue', label: 'Revenue', color: '#4f46e5' },
        { id: 'expenses', label: 'Expenses', color: '#e11d48' },
      ]}
    />
  }
>
  <BarChart data={revenueData} />
</ChartCard>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-chart-wrapper-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
