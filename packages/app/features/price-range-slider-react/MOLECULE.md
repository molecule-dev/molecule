# @molecule/app-price-range-slider-react

Numeric min/max range picker.

Exports `<PriceRangeSlider>` — TWO native `<input type="range">` controls
rendered side by side (min slider + max slider) with formatted endpoint
labels. The handles clamp against each other so `low <= high` always
holds. It is not a single-track dual-thumb slider.

## Quick Start

```tsx
import { useState } from 'react'
import { PriceRangeSlider } from '@molecule/app-price-range-slider-react'

function PriceFilter() {
  const [range, setRange] = useState<[number, number]>([50, 500])
  return (
    <PriceRangeSlider
      min={0}
      max={1000}
      value={range}
      onChange={setRange}
      step={10}
      label="Price range"
      formatValue={(n) => `$${n}`}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-price-range-slider-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `PriceRangeSliderProps`

Props for {@link PriceRangeSlider}.

```typescript
interface PriceRangeSliderProps {
  /** Minimum possible value. */
  min: number
  /** Maximum possible value. */
  max: number
  /** Current [low, high] tuple. If only one value is relevant, set low === min. */
  value: [number, number]
  /** Called whenever either handle moves. */
  onChange: (value: [number, number]) => void
  /** Step increment. Defaults to 1. */
  step?: number
  /** Called to format each endpoint label — defaults to USD currency formatting. */
  formatValue?: (n: number) => string
  /** Optional label above. */
  label?: React.ReactNode
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `PriceRangeSlider(props)`

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

- `props` — Component props (see {@link PriceRangeSliderProps}).

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

The default `formatValue` renders US-style dollars (`$1,000`) — always pass
your own formatter for non-USD apps. The two sliders carry fixed English
aria-labels ("Minimum"/"Maximum"); there is no locale bond. Requires a
wired ClassMap bond (`getClassMap()`).
