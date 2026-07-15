# @molecule/app-color-picker-react

Controlled HSV + RGB + HEX color picker — design canvases, photo editors,
animation tools, brand editors.

## Quick Start

```tsx
import { ColorPicker } from '@molecule/app-color-picker-react'

function StrokeColorField() {
  const [color, setColor] = useState('#3366ff')
  return <ColorPicker value={color} onChange={setColor} />
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-color-picker-react @molecule/app-i18n @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `ColorPickerProps`

Props for {@link ColorPicker}.

```typescript
interface ColorPickerProps {
  /** Current color as a 6-character HEX string with leading `#`. */
  value: string
  /** Called whenever the user picks a new color. Receives a `#rrggbb` string. */
  onChange: (hex: string) => void
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string
}
```

#### `HsvColor`

HSV color, hue degrees + saturation/value 0–1.

```typescript
interface HsvColor {
  /** Hue in degrees (0–360). */
  h: number
  /** Saturation (0–1). */
  s: number
  /** Value / brightness (0–1). */
  v: number
}
```

#### `RgbColor`

RGB color, 8-bit components (0–255).

```typescript
interface RgbColor {
  /** Red (0–255). */
  r: number
  /** Green (0–255). */
  g: number
  /** Blue (0–255). */
  b: number
}
```

### Functions

#### `clamp(n, lo, hi)`

Clamp a number to the inclusive range `[lo, hi]`.

```typescript
function clamp(n: number, lo: number, hi: number): number
```

- `n` — Input value.
- `lo` — Lower bound.
- `hi` — Upper bound.

**Returns:** The clamped value.

#### `ColorPicker(props)`

Controlled color picker — HSV (hue + saturation + value) sliders, RGB
sliders, and a HEX text input. All four representations stay in lockstep
with the controlling `value`.

Designed for design canvases, photo editors, animation tools, and brand
editors. Pure UI — no popover/anchor logic; parents render this inside
whatever portal/popover they prefer.

Styling is delegated to `getClassMap()`; only inline styles are used for
the live swatch background and slider track gradients.

```typescript
function ColorPicker({
  value,
  onChange,
  dataMolId,
  className,
}: ColorPickerProps): JSX.Element
```

- `props` — Component props.

**Returns:** The rendered picker element.

#### `hexToRgb(hex)`

Parse a `#rgb`/`#rrggbb` hex string into an RGB color. Falls back to black
for unparseable input rather than throwing — pickers shouldn't crash on
a stray empty string.

```typescript
function hexToRgb(hex: string): RgbColor
```

- `hex` — Color string (with or without the leading `#`).

**Returns:** The parsed RGB color.

#### `hsvToRgb(hsv)`

Convert HSV (h: 0–360, s/v: 0–1) to RGB (0–255).

```typescript
function hsvToRgb({ h, s, v }: HsvColor): RgbColor
```

- `hsv` — Color to convert.

**Returns:** The equivalent RGB color.

#### `isValidHex(hex)`

Whether `hex` parses to a 6-character hex color.

```typescript
function isValidHex(hex: string): boolean
```

- `hex` — Candidate hex string (with or without `#`).

**Returns:** `true` when the string parses cleanly.

#### `rgbToHex(rgb)`

Format an RGB color as a `#rrggbb` hex string (lowercase).

```typescript
function rgbToHex({ r, g, b }: RgbColor): string
```

- `rgb` — Color to format.

**Returns:** The hex string.

#### `rgbToHsv(rgb)`

Convert RGB (0–255) to HSV (h: 0–360, s/v: 0–1).

```typescript
function rgbToHsv({ r, g, b }: RgbColor): HsvColor
```

- `rgb` — Color to convert.

**Returns:** The equivalent HSV color.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-react`
- `@molecule/app-ui`
- `react`
