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
npm install @molecule/app-color-swatch-picker-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `ColorSwatch`

A single color option in the swatch picker with its value, CSS color, and optional label.

```typescript
interface ColorSwatch {
  /** Value stored in state (can be the raw color or a semantic id). */
  value: string
  /** CSS color (any valid color string). */
  color: string
  /** Optional label shown as tooltip / aria-label. */
  label?: string
}
```

### Functions

#### `ColorSwatchPicker(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Grid of colored circles with single-select state. Used for tag
colors, label colors, theme accent swatches, etc.

```typescript
function ColorSwatchPicker({
  swatches,
  value,
  onChange,
  size = 28,
  gap = 'sm',
  preview,
  className,
  ariaLabel,
}: ColorSwatchPickerProps): JSX.Element
```

- `root0` — *
- `root0` — .swatches
- `root0` — .value
- `root0` — .onChange
- `root0` — .size
- `root0` — .gap
- `root0` — .preview
- `root0` — .className
- `root0` — .ariaLabel

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
