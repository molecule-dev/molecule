# @molecule/app-feature-track-lane-react

Horizontal track-lane primitive for multi-track timelines (music DAW,
video editor, animation tool). Renders one lane row of draggable +
resizable clip blocks on a `pixelsPerSecond` time axis.

Exports `<TrackLane>` and the `Clip` type, plus the pure-function
helpers `clipToPixels`, `pixelsToTime`, and `clampClipMove` that
back the pointer-event drag/resize math.

## Quick Start

```tsx
import { TrackLane } from '@molecule/app-feature-track-lane-react'

<TrackLane
  name="Drums"
  clips={[
    { id: 'a', startTime: 0, duration: 2, color: '#0af', label: 'Kick' },
    { id: 'b', startTime: 4, duration: 1.5, label: 'Snare' },
  ]}
  pixelsPerSecond={20}
  onClipMove={(id, t) => updateClip(id, { startTime: t })}
  onClipResize={(id, d) => updateClip(id, { duration: d })}
  onClipClick={(id) => setSelected(id)}
  selectedClipId={selected}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-track-lane-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `Clip`

A single clip block on a track lane. `startTime` and `duration` are
both in seconds; `pixelsPerSecond` on the lane converts them to the
on-screen geometry. `id` is a stable identifier used as the React
key and as the argument passed back to all event handlers. `color`
accents the body fill (defaults to a neutral surface) and `label`
is rendered inside the clip when given.

```typescript
interface Clip {
  /** Stable identifier for the clip (used as a React key + handler arg). */
  id: string
  /** Clip start time on the lane in seconds. */
  startTime: number
  /** Clip duration in seconds. Always positive — minimum is enforced. */
  duration: number
  /** Optional accent color for the clip body (any valid CSS color). */
  color?: string
  /** Optional inline label rendered on top of the clip body. */
  label?: ReactNode
}
```

#### `TrackLaneProps`

Props for `<TrackLane>`.

```typescript
interface TrackLaneProps {
  /** Optional lane name shown in the leading lane header. */
  name?: ReactNode
  /** Clips on this lane. Order is preserved as-is. */
  clips: Clip[]
  /** Horizontal time scale, defaults to 20. */
  pixelsPerSecond?: number
  /**
   * Optional opaque lane identifier. Forwarded to handlers and emitted
   * as `data-lane` so multi-lane parents can tell lanes apart.
   */
  lane?: string
  /** Lane row height in pixels. Defaults to 44. */
  height?: number
  /** Called when a clip is dragged horizontally. */
  onClipMove?: (clipId: string, startTime: number, lane?: string) => void
  /** Called when a clip's right edge handle is dragged. */
  onClipResize?: (clipId: string, duration: number, lane?: string) => void
  /** Called when a clip body is clicked (no drag). */
  onClipClick?: (clipId: string, lane?: string) => void
  /** Currently-selected clip id (renders the selection ring on that clip). */
  selectedClipId?: string
  /** Extra classes merged onto the root element. */
  className?: string
}
```

### Functions

#### `clampClipMove(proposedStartTime)`

Clamp the proposed new `startTime` for a clip move so the clip stays
non-negative. (No upper bound — the parent decides whether to clip
to a song length.)

```typescript
function clampClipMove(proposedStartTime: number): number
```

- `proposedStartTime` — The candidate start time in seconds.

**Returns:** The clamped start time.

#### `clipToPixels(clip, pixelsPerSecond)`

Convert a `Clip` to its on-lane pixel geometry.

```typescript
function clipToPixels(clip: Pick<Clip, "startTime" | "duration">, pixelsPerSecond: number): { left: number; width: number; }
```

- `clip` — The clip to project.
- `pixelsPerSecond` — Horizontal scale.

**Returns:** `{ left, width }` in pixels.

#### `pixelsToTime(pixels, pixelsPerSecond)`

Convert a pixel offset back to a time value, clamped to `>= 0`.

```typescript
function pixelsToTime(pixels: number, pixelsPerSecond: number): number
```

- `pixels` — Offset in pixels.
- `pixelsPerSecond` — Horizontal scale.

**Returns:** Time in seconds (never negative).

#### `TrackLane(props)`

One row of a multi-track timeline — renders draggable + resizable
clip blocks on a `pixelsPerSecond` time axis. Pointer-down on a clip
body starts a drag-to-move, pointer-down on the right-edge handle
starts a drag-to-resize, and a click without movement fires
`onClipClick`. All styling routes through `getClassMap()` and all
user-visible text routes through `t()` (via the companion
`@molecule/app-locales-feature-track-lane` locale bond).

```typescript
function TrackLane(props: TrackLaneProps): JSX.Element
```

- `props` — Component props.

**Returns:** The track-lane element.

### Constants

#### `DRAG_DISTANCE_THRESHOLD_PX`

Pointer-distance threshold (px) before a press becomes a drag.

```typescript
const DRAG_DISTANCE_THRESHOLD_PX: 3
```

#### `MIN_CLIP_DURATION_SECONDS`

Minimum clip duration in seconds — clips can't be resized below this.

```typescript
const MIN_CLIP_DURATION_SECONDS: 0.05
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

## Translations

Translation strings are provided by `@molecule/app-locales-feature-track-lane`.
