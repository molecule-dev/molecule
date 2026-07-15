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
npm install @molecule/app-price-range-slider-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `PriceRangeSlider(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Dual-handle numeric range slider using two native `<input type="range">`
controls. Apps supply min/max/step and a `formatValue` to render the
endpoint labels (typical use: currency-formatted prices).

```typescript
function PriceRangeSlider({
  min,
  max,
  value,
  onChange,
  step = 1,
  formatValue,
  label,
  className,
}: PriceRangeSliderProps): React.ReactElement<unknown, string | React.JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .min
- `root0` — .max
- `root0` — .value
- `root0` — .onChange
- `root0` — .step
- `root0` — .formatValue
- `root0` — .label
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
