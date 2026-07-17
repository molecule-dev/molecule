# @molecule/app-charts-chartjs

`@molecule/app-charts-chartjs` — a Chart.js-backed provider for the
`@molecule/app-charts` charting interface. Bond it once at startup and every
`createLineChart` / `createBarChart` / … call renders a REAL chart (the
built-in default provider only paints a "no provider bonded" placeholder).

## Quick Start

```ts
import { setProvider, createLineChart } from '@molecule/app-charts'
import { provider } from '@molecule/app-charts-chartjs'

setProvider(provider) // wire ONCE at app startup, before any create*Chart call

// In a component (React ref + effect), destroy on cleanup:
const chart = createLineChart(canvasEl, {
  labels: ['Jan', 'Feb', 'Mar'],
  datasets: [{ label: 'Revenue', data: [12, 19, 8] }],
})
// …later: chart.destroy()
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-charts-chartjs @molecule/app-charts chart.js
```

## API

### Functions

#### `createProvider()`

Creates a Chart.js-backed `ChartProvider`.

```typescript
function createProvider(): ChartProvider
```

**Returns:** A `ChartProvider` that renders real charts via Chart.js.

### Constants

#### `provider`

The default Chart.js chart provider, ready to bond with `setProvider(provider)`.

```typescript
const provider: ChartProvider
```

## Core Interface
Implements `@molecule/app-charts` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-charts'
import { provider } from '@molecule/app-charts-chartjs'

export function setupChartsChartjs(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-charts` ^1.0.0

### Runtime Dependencies

- `@molecule/app-charts`
- `chart.js`

Renders line/bar/pie/doughnut/area/scatter/bubble/radar/polar natively. `area`
is a line chart with `fill: true`; `polar` maps to Chart.js `polarArea`. The
remaining molecule chart types (heatmap/treemap/funnel/gauge/candlestick) are
NOT in base Chart.js — `createChart` throws an actionable error for them (add a
Chart.js plugin, or use a different provider) rather than mis-rendering.

ALWAYS `destroy()` the returned `ChartInstance` on unmount — Chart.js attaches
canvas + resize listeners, so a chart left undestroyed leaks and re-creating on
the same canvas throws "Canvas is already in use".

BROWSER-ONLY: it draws to a `<canvas>` and pulls in Chart.js (DOM). Import +
wire it from app/client code, never server code.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Every chart on the app's screens renders with real data — no blank
  canvas, no NaN/undefined axis labels.
- [ ] Plotted values match the data: spot-check at least one point/bar/slice
  against a number you can verify elsewhere in the UI.
- [ ] Charts update when their inputs change (date range, filter, or a newly
  created record that should appear).
- [ ] An empty dataset renders an empty state or zeroed axes — not a crash
  or a stale chart from previous data.
- [ ] Tooltips and legends (where enabled) show the correct labels and
  values on hover.
- [ ] Resizing the window/panel keeps charts legible (no overflow, no
  zero-height canvas).
