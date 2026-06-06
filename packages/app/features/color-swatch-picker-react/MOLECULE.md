# @molecule/app-color-swatch-picker-react

React color-swatch picker.

Exports `<ColorSwatchPicker>` — grid of colored circles with single-select state.

## Quick Start

```tsx
import { ColorSwatchPicker } from '@molecule/app-color-swatch-picker-react'

const swatches = [
  { value: 'red', color: '#ef4444', label: 'Red' },
  { value: 'blue', color: '#3b82f6', label: 'Blue' },
  { value: 'green', color: '#22c55e', label: 'Green' },
]

<ColorSwatchPicker
  swatches={swatches}
  value={selected}
  onChange={(value) => setSelected(value)}
  ariaLabel="Tag color"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-color-swatch-picker-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
