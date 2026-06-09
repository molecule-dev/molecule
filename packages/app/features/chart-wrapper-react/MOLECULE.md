# @molecule/app-chart-wrapper-react

React ChartCard + ChartLegend wrappers around `@molecule/app-charts`.

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

## API

### Interfaces

#### `ChartLegendItem`

Describes a single series entry rendered in the chart legend.

```typescript
interface ChartLegendItem {
  id: string
  label: ReactNode
  /** Swatch color (any valid CSS color or ClassMap token string). */
  color: string
  /** Optional value / count display next to the label. */
  value?: ReactNode
  /** Whether the series is hidden (greyed out). */
  hidden?: boolean
}
```

### Functions

#### `ChartCard(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Uniform chrome around an `@molecule/app-charts` rendering — header +
actions + optional summary strip + chart body + optional footer.

The chart library itself comes from the `@molecule/app-charts` bond;
this package only provides the surrounding container.

```typescript
function ChartCard({
  title,
  description,
  actions,
  summary,
  children,
  footer,
  minChartHeight = 240,
  className,
  dataMolId,
}: ChartCardProps): JSX.Element
```

- `root0` — *
- `root0` — .title
- `root0` — .description
- `root0` — .actions
- `root0` — .summary
- `root0` — .children
- `root0` — .footer
- `root0` — .minChartHeight
- `root0` — .className
- `root0` — .dataMolId

#### `ChartLegend(root0, root0, root0, root0, root0)`

Chart legend — swatch + label (+ optional value) per series. When
`onToggle` is provided, items become buttons that toggle series
visibility.

```typescript
function ChartLegend({
  items,
  onToggle,
  layout = 'horizontal',
  className,
}: ChartLegendProps): JSX.Element
```

- `root0` — *
- `root0` — .items
- `root0` — .onToggle
- `root0` — .layout
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
