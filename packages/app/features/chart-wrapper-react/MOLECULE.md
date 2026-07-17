# @molecule/app-chart-wrapper-react

React ChartCard + ChartLegend wrappers around `@molecule/app-charts`.

Exports:
- `<ChartCard>` — uniform chrome (title / description / actions / summary /
  body / footer) around a chart rendering. `minChartHeight` (default 240)
  stops responsive charts collapsing; `dataMolId` sets `data-mol-id`.
- `<ChartLegend>` — swatch + label (+ value) legend. Items become toggle
  buttons when `onToggle` is provided.
- `ChartLegendItem` type.

These wrappers provide ONLY the surrounding chrome. The chart itself is
whatever you render as `children` — typically a canvas driven by
`createLineChart`/`createBarChart` from `@molecule/app-charts` (via a real
bonded ChartProvider) or your own chart component. There is no `<BarChart>`
component in `@molecule/app-charts`.

## Quick Start

```tsx
import { useEffect, useRef } from 'react'
import { ChartCard, ChartLegend } from '@molecule/app-chart-wrapper-react'
import { createBarChart } from '@molecule/app-charts'

function RevenueChart() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const chart = createBarChart(ref.current, {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [{ label: 'Revenue', data: [4200, 5800, 5100] }],
    })
    return () => chart.destroy()
  }, [])
  return <canvas ref={ref} height={240} />
}

<ChartCard
  title="Monthly Revenue"
  description="Last 12 months"
  footer={
    <ChartLegend
      items={[
        { id: 'revenue', label: 'Revenue', color: '#4f46e5' },
        { id: 'expenses', label: 'Expenses', color: '#e11d48' },
      ]}
    />
  }
>
  <RevenueChart />
</ChartCard>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-chart-wrapper-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ChartCardProps`

```typescript
interface ChartCardProps {
  /** Card heading. */
  title: ReactNode
  /** Optional supporting description. */
  description?: ReactNode
  /** Optional right-aligned actions (range selector, export menu, filter). */
  actions?: ReactNode
  /** Optional KPI summary row shown between header and chart (e.g. "Total: 12,345 +12%"). */
  summary?: ReactNode
  /** Chart content — any rendering driven by `@molecule/app-charts`. */
  children: ReactNode
  /** Optional footer below the chart (legend, source attribution). */
  footer?: ReactNode
  /** Set a minimum chart height so responsive charts don't collapse. */
  minChartHeight?: number
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}
```

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

#### `ChartLegendProps`

```typescript
interface ChartLegendProps {
  items: ChartLegendItem[]
  /** Called when an item is toggled. */
  onToggle?: (id: string) => void
  /** Layout direction. */
  layout?: 'horizontal' | 'vertical'
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `ChartCard(props)`

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

- `props` — Component props (see {@link ChartCardProps}).

#### `ChartLegend(props)`

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

- `props` — Component props (see {@link ChartLegendProps}).

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

`@molecule/app-charts`' built-in provider renders a non-functional placeholder
notice (and logs a one-time console warning), not a real chart — wire a real
`ChartProvider` (or render your own chart component as `children`) before
shipping. Legend `items` labels/values are consumer-provided ReactNodes; pass
translated strings via `t()`.
