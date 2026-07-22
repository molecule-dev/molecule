# @molecule/app-feature-animation-canvas-react

React animation-canvas primitives.

Exports:
- `<AnimationCanvas>` — SVG renderer that interpolates shape state
  between keyframes with optional per-property bezier easing.
- `interpolateState`, `bracketKeyframes`, `lerp`, `pickEasing` —
  pure interpolation helpers.
- `cubicBezier`, `sampleEasing`, `resolveEasing`, `easingFunctions`
  — pure easing helpers.
- `AnimationKeyframe`, `ShapeState`, `ShapeEasing`, `Easing`,
  `EasingPreset`, `CubicBezierPoints` types.

Used by the animation-tool flagship app to drive a state-machine
keyframe graph + bezier easing curves over an SVG canvas.

## Quick Start

```tsx
import {
  AnimationCanvas,
  type AnimationKeyframe,
} from '@molecule/app-feature-animation-canvas-react'

const keyframes: AnimationKeyframe[] = [
  { time: 0, state: [{ id: 'box', x: 0, y: 50, rotation: 0, scale: 1, opacity: 1 }] },
  { time: 1, state: [{ id: 'box', x: 200, y: 50, rotation: 90, scale: 1.5, opacity: 1, easing: 'easeInOut' }] },
]

function Demo() {
  const [t, setT] = useState(0)
  return (
    <AnimationCanvas
      keyframes={keyframes}
      currentTime={t}
      onSeek={setT}
      width={400}
      height={200}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-animation-canvas-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `AnimationCanvasProps`

`<AnimationCanvas>` props.

```typescript
interface AnimationCanvasProps {
  /**
   * Keyframes (sorted ascending by `time`). Each entry is a snapshot of
   * every shape's state at a moment in time.
   */
  keyframes: AnimationKeyframe[]
  /**
   * Optional callback fired when the consumer mutates keyframes via a
   * built-in interaction. (Currently the canvas itself never mutates;
   * the prop exists so consumers can adopt the controlled / uncontrolled
   * pattern as the feature grows.)
   */
  onChange?: (next: AnimationKeyframe[]) => void
  /** Current playhead time. Clamped to the keyframe range internally. */
  currentTime: number
  /** Optional callback fired when the user scrubs the timeline. */
  onSeek?: (next: number) => void
  /** Canvas width in CSS pixels. */
  width: number
  /** Canvas height in CSS pixels. */
  height: number
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}
```

#### `AnimationKeyframe`

Single keyframe — a snapshot of every shape's state at a point in
time.

```typescript
interface AnimationKeyframe {
  /**
   * Keyframe time in seconds (or any consistent unit). Keyframes must
   * be sorted ascending by time before being passed to the canvas.
   */
  time: number
  /** Per-shape state at this keyframe. */
  state: ShapeState[]
}
```

#### `ShapeEasing`

Per-property easing override. Each property animates independently;
if a property is omitted the canvas uses linear easing for that
property (or `easing` if the whole keyframe sets one — see below).

```typescript
interface ShapeEasing {
  /** Easing applied to `x`. */
  x?: Easing
  /** Easing applied to `y`. */
  y?: Easing
  /** Easing applied to `rotation`. */
  rotation?: Easing
  /** Easing applied to `scale`. */
  scale?: Easing
  /** Easing applied to `opacity`. */
  opacity?: Easing
}
```

#### `ShapeState`

State of a single shape at a single keyframe.

The canvas treats every property as independent — if a shape appears
in keyframe A but not B, it is interpreted as "vanishes at B".

```typescript
interface ShapeState {
  /** Shape identifier; preserved across keyframes. */
  id: string
  /** World-space x in canvas units. */
  x: number
  /** World-space y in canvas units. */
  y: number
  /** Rotation in degrees. */
  rotation: number
  /** Uniform scale factor (1 = identity). */
  scale: number
  /** Opacity, `0` (transparent) → `1` (opaque). */
  opacity: number
  /**
   * Per-property easing applied to the segment LEADING INTO this
   * keyframe. When a preset / tuple is set on the whole shape via
   * `easing`, individual entries here override per-property.
   */
  easings?: ShapeEasing
  /**
   * Whole-shape easing applied to every property unless a
   * `easings.<prop>` overrides it.
   */
  easing?: Easing
}
```

### Types

#### `CubicBezierPoints`

Cubic-Bezier control points `[c1x, c1y, c2x, c2y]` — the same shape
the CSS `cubic-bezier()` timing function uses.

Endpoints are implicitly `(0,0)` and `(1,1)`. `c1x` and `c2x` are
normally clamped to `[0, 1]` so the easing is monotonic in time.

```typescript
type CubicBezierPoints = readonly [number, number, number, number]
```

#### `Easing`

Easing for the segment leading INTO a keyframe. May be a named preset
or an explicit Bezier control-point tuple.

```typescript
type Easing = EasingPreset | CubicBezierPoints
```

#### `EasingPreset`

Named easing presets. Each preset corresponds to a fixed cubic-Bezier
control-point quadruple `[c1x, c1y, c2x, c2y]`.

```typescript
type EasingPreset = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
```

### Functions

#### `AnimationCanvas(props)`

SVG animation canvas. Renders the interpolated shape state at
`currentTime` between the two bracketing keyframes, applying any
per-property bezier easing curves declared on the target keyframe.

The canvas itself is rendering-only — mutations to keyframes are
delegated to the consumer via `onChange`. Scrub via `onSeek` (clicking
the canvas seeks to the corresponding time linearly mapped across
width). Style is driven entirely by `getClassMap()`; inline styles
are reserved for SVG attributes that classes can't express.

```typescript
function AnimationCanvas(props: AnimationCanvasProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props.

**Returns:** The animation canvas element.

#### `bracketKeyframes(keyframes, time)`

Find the bracketing keyframe pair `[a, b]` for a given time.

- If `time <= keyframes[0].time`, returns `[keyframes[0], keyframes[0], 0]`.
- If `time >= last.time`, returns `[last, last, 1]`.
- Otherwise returns `[a, b, alpha]` where `alpha = (time - a.time) /
  (b.time - a.time)` so the caller can apply easing to `alpha` itself.

```typescript
function bracketKeyframes(keyframes: AnimationKeyframe[], time: number): { a: AnimationKeyframe; b: AnimationKeyframe; alpha: number; }
```

- `keyframes` — Keyframes sorted ascending by `time`.
- `time` — Current playhead time.

**Returns:** Bracketing keyframe pair and the linear blend ratio `alpha`.

#### `cubicBezier(t, p1x, p1y, p2x, p2y)`

Sample a cubic Bezier at time `t`. Endpoints are fixed at `(0,0)` and
`(1,1)`; only the two intermediate control points are supplied.

Returned value is the y-coordinate of the curve at the moment its
x-coordinate equals `t` — i.e. the timing-function output, NOT the y
of the curve at parameter `t`. The x-by-time inversion is performed
via Newton-Raphson with a bisection fallback (the same algorithm
Chrome / Firefox use for `cubic-bezier()`).

```typescript
function cubicBezier(t: number, p1x: number, p1y: number, p2x: number, p2y: number): number
```

- `t` — Normalized time, `0` → `1`.
- `p1x` — First control-point x.
- `p1y` — First control-point y.
- `p2x` — Second control-point x.
- `p2y` — Second control-point y.

**Returns:** Eased y in `[0, 1]` (or slightly outside for over-shoot curves whose control points exceed the unit square).

#### `interpolateState(keyframes, time)`

Interpolate the full shape-state set at the given time.

- Shapes present in BOTH bracketing keyframes are eased per-property.
- Shapes present in only ONE side are returned verbatim from the side
  they're present on, with `opacity` faded toward 0 if they vanish.

```typescript
function interpolateState(keyframes: AnimationKeyframe[], time: number): ShapeState[]
```

- `keyframes` — Keyframes sorted ascending by `time`.
- `time` — Playhead time. Clamped to `[firstKeyframe.time, lastKeyframe.time]` so callers can pass any value safely.

**Returns:** Interpolated shape states ready to be rendered.

#### `lerp(a, b, t)`

Linear interpolation between two scalars.

```typescript
function lerp(a: number, b: number, t: number): number
```

- `a` — Value at `t = 0`.
- `b` — Value at `t = 1`.
- `t` — Normalized time in `[0, 1]`.

**Returns:** Interpolated value.

#### `pickEasing(target, prop)`

Pick the per-property easing for a given prop on a target keyframe.

Resolution order (first match wins):

1. `state.easings[prop]` on the TARGET shape (the shape we're
   animating INTO).
2. `state.easing` on the TARGET shape (whole-shape default).
3. Linear (returned as `undefined`).

```typescript
function pickEasing(target: ShapeState, prop: AnimatableProp): Easing | undefined
```

- `target` — The target shape state (the keyframe being eased INTO).
- `prop` — The animatable property name.

**Returns:** The easing to apply to that property's segment, or `undefined` for linear.

#### `resolveEasing(easing)`

Resolve a named preset or explicit tuple into a `CubicBezierPoints`
tuple. Defaults to linear when `easing` is undefined.

```typescript
function resolveEasing(easing: Easing | undefined): CubicBezierPoints
```

- `easing` — Easing preset name or explicit Bezier tuple.

**Returns:** Resolved control-point tuple.

#### `sampleEasing(easing, t)`

Sample an easing (preset or tuple) at normalized time `t`.

```typescript
function sampleEasing(easing: Easing | undefined, t: number): number
```

- `easing` — Easing preset name or explicit Bezier tuple.
- `t` — Normalized time, `0` → `1`.

**Returns:** Eased value in `[0, 1]`.

### Constants

#### `easingFunctions`

Built-in named easing presets. Tuples are interpreted as
`[c1x, c1y, c2x, c2y]`. Values match the CSS spec:
`ease-in`, `ease-out`, and `ease-in-out`.

```typescript
const easingFunctions: Readonly<Record<EasingPreset, CubicBezierPoints>>
```

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

- The canvas draws every shape as a fixed 24px square filled with
  `currentColor` (transformed by x/y/rotation/scale/opacity). There is
  no shape-type, size, color, or custom-renderer prop yet — for real
  artwork, use the exported interpolation/easing helpers
  (`interpolateState`, `sampleEasing`, …) to drive your own SVG.
- Keyframes MUST be sorted ascending by `time`; the interpolators do
  not sort for you.
- `onChange` is reserved for future built-in interactions — the canvas
  itself never mutates keyframes today. Clicking maps linearly across
  the width to a time and fires `onSeek`.
- Aria labels resolve through `t()` with English fallbacks; companion
  locale bond: `@molecule/app-locales-feature-animation-canvas`.
  Requires a wired ClassMap bond and the app I18nProvider.

## Translations

Translation strings are provided by `@molecule/app-locales-feature-animation-canvas`.
