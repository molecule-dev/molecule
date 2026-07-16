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

#### `ColorSwatchPickerProps`

```typescript
interface ColorSwatchPickerProps {
  /** Swatch definitions. */
  swatches: ColorSwatch[]
  /** Currently selected swatch value. */
  value: string
  /** Called when a swatch is picked. */
  onChange: (value: string) => void
  /** Swatch diameter in pixels. Defaults to 28. */
  size?: number
  /** Gap between swatches. */
  gap?: 'xs' | 'sm' | 'md'
  /** Optional child rendered below (e.g. a live preview). */
  preview?: ReactNode
  /** Extra classes. */
  className?: string
  /** `aria-label` for the group. */
  ariaLabel?: string
}
```

### Functions

#### `ColorSwatchPicker(props)`

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

- `props` — Component props (see {@link ColorSwatchPickerProps}).

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

All text (`label` per swatch, `ariaLabel` for the group) is
consumer-provided — pass translated strings via `t()`; the component has no
built-in copy. Selection is fully controlled: persist `onChange(value)` and
re-render with the new `value`. Swatches render as `role="radio"` buttons
sized by the `size` prop (default 28px) with the CSS `color` you provide.
