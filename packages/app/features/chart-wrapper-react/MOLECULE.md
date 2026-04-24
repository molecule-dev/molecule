# @molecule/app-chart-wrapper-react

React ChartCard + ChartLegend wrappers around @molecule/app-charts.

Exports:
- `<ChartCard>` — uniform chrome (title / description / actions / summary /
  body / footer) around a chart rendering.
- `<ChartLegend>` — swatch + label (+ value) legend with optional toggle.
- `ChartLegendItem` type.

The chart library itself comes from the `@molecule/app-charts` bond;
these wrappers only provide surrounding chrome.

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
