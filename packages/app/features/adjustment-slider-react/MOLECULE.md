# @molecule/app-adjustment-slider-react

Adjustment slider feature for molecule.dev.

Bipolar (zero-center) numeric slider tuned for photo-editor / DAW /
animation parameter controls (brightness, contrast, saturation, exposure,
gain, pan, etc.). Pairs well with `@molecule/app-feature-image-canvas-react`.

## Quick Start

```tsx
import { AdjustmentSlider } from '@molecule/app-adjustment-slider-react'

<AdjustmentSlider
  label="Exposure"
  value={exposure}
  onChange={setExposure}
  min={-100}
  max={100}
  step={1}
  bipolar
  unit="%"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-adjustment-slider-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `AdjustmentSliderProps`

Public props for `<AdjustmentSlider>`.

```typescript
interface AdjustmentSliderProps {
  /** Visible label (rendered to the left of the slider). */
  label: string
  /** Current numeric value. */
  value: number
  /** Called whenever the slider value changes. */
  onChange: (value: number) => void
  /** Lower bound. Defaults to `-100`. */
  min?: number
  /** Upper bound. Defaults to `100`. */
  max?: number
  /** Step increment. Defaults to `1`. */
  step?: number
  /**
   * When `true` (default), the slider is bipolar with a center mark at zero
   * and double-click / Reset returns the value to `0`. When `false`, the
   * slider is unipolar (a normal range slider) and double-click resets to
   * `min`.
   */
  bipolar?: boolean
  /** Optional unit suffix (e.g. `'%'`, `'dB'`) appended to the default formatter. */
  unit?: string
  /**
   * Optional formatter overriding the default `value + (unit || '')` display.
   * Useful for rendering e.g. `+12` (signed) or `1.4 EV`.
   */
  format?: AdjustmentSliderFormatter
  /**
   * Optional reset handler. When provided, double-clicking the slider OR
   * pressing the visual Reset button calls this instead of resetting to
   * the default reset value.
   */
  onReset?: () => void
  /** Optional extra class names appended to the outer container. */
  className?: string
  /** Optional `data-mol-id` for AI-agent / E2E targeting. */
  dataMolId?: string
}
```

### Types

#### `AdjustmentSliderFormatter`

Function signature used to format the rendered numeric value.

```typescript
type AdjustmentSliderFormatter = (value: number) => string
```

### Functions

#### `AdjustmentSlider(props)`

Bipolar (zero-center) adjustment slider — a labelled `<input type="range">`
tuned for photo-editor / DAW / animation parameter controls (brightness,
contrast, saturation, exposure, gain, pan, etc.).

Behaviour:
- When `bipolar` is `true` (default), a center mark is rendered at zero
  and the reset target is `0`. When `false`, the slider is unipolar and
  the reset target is `min`.
- Double-clicking the input resets the value (calling `onReset` if
  provided, otherwise emitting `defaultResetValue(min, bipolar)` via
  `onChange`).
- Up/Right arrows nudge by `step`; Down/Left arrows nudge by `-step`.
  Holding Shift multiplies the nudge by 10.
- The numeric value display is formatted via `format` if supplied,
  otherwise via `value + (unit || '')`.

```typescript
function AdjustmentSlider({
  label,
  value,
  onChange,
  min = -100,
  max = 100,
  step = 1,
  bipolar = true,
  unit,
  format,
  onReset,
  className,
  dataMolId,
}: AdjustmentSliderProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props.
- `props.label` — Visible control label.
- `props.value` — Current numeric value.
- `props.onChange` — Called whenever the value changes.
- `props.min` — Lower bound (default `-100`).
- `props.max` — Upper bound (default `100`).
- `props.step` — Step increment (default `1`).
- `props.bipolar` — Bipolar / zero-center mode (default `true`).
- `props.unit` — Optional unit suffix appended to the default formatter.
- `props.format` — Optional custom value formatter.
- `props.onReset` — Optional reset handler (overrides default reset).
- `props.className` — Optional extra classes for the outer container.
- `props.dataMolId` — Optional `data-mol-id` for the outer container.

**Returns:** The rendered adjustment slider.

#### `clampStep(value, min, max, step)`

Clamp a numeric value to the inclusive `[min, max]` range, snapping to the
nearest multiple of `step` measured from `min`. Does not assume `min === 0`
(so bipolar `[-100, 100]` works correctly with non-integer steps).

```typescript
function clampStep(value: number, min: number, max: number, step: number): number
```

- `value` — The raw value to normalise.
- `min` — Inclusive lower bound.
- `max` — Inclusive upper bound.
- `step` — Step increment (must be > 0).

**Returns:** The clamped + step-snapped value.

#### `defaultFormatter(unit)`

Build the default value formatter — appends an optional unit suffix.

```typescript
function defaultFormatter(unit?: string): AdjustmentSliderFormatter
```

- `unit` — Optional unit string (e.g. `'%'`).

**Returns:** A formatter producing `"<value><unit>"`.

#### `defaultResetValue(min, bipolar)`

Compute the value the slider should reset to when double-clicked.

```typescript
function defaultResetValue(min: number, bipolar: boolean): number
```

- `min` — Inclusive lower bound.
- `bipolar` — Whether the slider is in bipolar (zero-center) mode.

**Returns:** `0` for bipolar sliders, `min` otherwise.

#### `keyboardNudge(step, shift)`

Compute the keyboard nudge step for arrow keys.

Plain arrow → `step`. Shift-modifier → `step * 10` so users can move in
coarser increments. Always at least `step`.

```typescript
function keyboardNudge(step: number, shift: boolean): number
```

- `step` — The base step increment.
- `shift` — Whether the Shift modifier is held.

**Returns:** The effective per-keypress delta.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

## Translations

Translation strings are provided by `@molecule/app-locales-adjustment-slider`.
