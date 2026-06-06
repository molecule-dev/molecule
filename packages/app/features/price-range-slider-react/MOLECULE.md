# @molecule/app-price-range-slider-react

Numeric range slider with two handles.

Exports `<PriceRangeSlider>` — dual-handle range slider with formatted labels.

## Quick Start

```tsx
import { PriceRangeSlider } from '@molecule/app-price-range-slider-react'

const [range, setRange] = useState<[number, number]>([50, 500])

<PriceRangeSlider
  min={0}
  max={1000}
  value={range}
  onChange={setRange}
  step={10}
  label="Price range"
  formatValue={(n) => `$${n}`}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-price-range-slider-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
