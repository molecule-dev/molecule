# @molecule/app-feature-video-timeline-react

Multi-track video timeline composing one `<TrackLane>` per track row
with a shared time ruler, playhead, zoom slider + Ctrl+wheel zoom,
and ripple/insert edit modes.

Exports `<VideoTimeline>`, the `Track` and `VideoTimelineMode` types,
and the pure-function helpers `clampZoom`, `zoomFromWheelDelta`,
`computeRulerTicks`, `computeRippleUpdates`, and `formatTickTime`
that back the zoom math, ruler tick generation, and ripple-mode
fan-out.

## Quick Start

```tsx
import { VideoTimeline } from '@molecule/app-feature-video-timeline-react'

<VideoTimeline
  tracks={[
    { id: 'v1', kind: 'video', clips: [{ id: 'a', startTime: 0, duration: 5, label: 'Intro' }] },
    { id: 'a1', kind: 'audio', clips: [{ id: 'b', startTime: 0, duration: 12 }] },
  ]}
  currentTime={3.2}
  duration={60}
  pixelsPerSecond={20}
  mode="ripple"
  onSeek={(t) => setCurrentTime(t)}
  onClipMove={(id, startTime, trackId) => updateClip(trackId, id, { startTime })}
  onClipResize={(id, duration, trackId) => updateClip(trackId, id, { duration })}
  onZoomChange={(pps) => setZoom(pps)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-video-timeline-react @molecule/app-feature-track-lane-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `Track`

One track row on a `<VideoTimeline>`. Tracks are rendered in array
order top-to-bottom and each track delegates clip rendering to a
`<TrackLane>` row.

```typescript
interface Track {
  /** Stable identifier — used as the React key and lane id passed to handlers. */
  id: string
  /** The kind of media on this track. */
  kind: TrackKind
  /** Clips on this track. Order is preserved as-is. */
  clips: Clip[]
  /** Optional human-friendly track name; falls back to a translated kind label. */
  name?: string
}
```

#### `VideoTimelineProps`

Props for `<VideoTimeline>`.

```typescript
interface VideoTimelineProps {
  /** Tracks to render. Order is preserved as-is. */
  tracks: Track[]
  /** Current playhead time in seconds. Drives the playhead vertical line. */
  currentTime: number
  /** Total timeline duration in seconds — used to size the scrollable body. */
  duration: number
  /** Called when the user clicks/scrubs the ruler. */
  onSeek?: (time: number) => void
  /** Called when a clip on a lane is dragged horizontally. */
  onClipMove?: (clipId: string, startTime: number, trackId: string) => void
  /** Called when a clip's right-edge resize handle is dragged. */
  onClipResize?: (clipId: string, duration: number, trackId: string) => void
  /** Horizontal scale (px per second). Defaults to 20. */
  pixelsPerSecond?: number
  /** Lower zoom bound for Ctrl+wheel / slider. Defaults to 2. */
  zoomMin?: number
  /** Upper zoom bound for Ctrl+wheel / slider. Defaults to 200. */
  zoomMax?: number
  /** Edit mode for clip drags. Defaults to `'ripple'`. */
  mode?: VideoTimelineMode
  /** Called when the user changes the zoom (slider or Ctrl+wheel). */
  onZoomChange?: (pixelsPerSecond: number) => void
  /** Optional currently-selected clip id. */
  selectedClipId?: string
  /** Called when a clip is clicked (no drag). */
  onClipClick?: (clipId: string, trackId: string) => void
  /** Per-track row height in pixels. Defaults to 44. */
  trackHeight?: number
  /** Width of the leading lane-header column in pixels. Defaults to 120. */
  laneHeaderWidth?: number
  /** Height of the time ruler row in pixels. Defaults to 28. */
  rulerHeight?: number
  /** Extra classes merged onto the root element. */
  className?: string
}
```

### Types

#### `TrackKind`

The kind of media a track holds. Drives the lane name fallback,
the default clip color, and the data attribute parents can hook
onto for kind-specific styling.

```typescript
type TrackKind = 'video' | 'audio' | 'subtitle'
```

#### `VideoTimelineMode`

Edit mode applied to clip drags.

- `insert` — dragging a clip just drops it at the new position; other clips
  on the lane stay where they are.
- `ripple` — dragging a clip shifts every later clip on the same lane by
  the same delta, preserving inter-clip gaps.

```typescript
type VideoTimelineMode = 'ripple' | 'insert'
```

### Functions

#### `clampZoom(value, min, max)`

Clamp a candidate `pixelsPerSecond` value into `[min, max]`. Used by
the zoom slider, Ctrl+wheel, and any external zoom button that calls
`onZoomChange`.

```typescript
function clampZoom(value: number, min: number, max: number): number
```

- `value` — Candidate horizontal scale in px/sec.
- `min` — Lower bound (inclusive).
- `max` — Upper bound (inclusive).

**Returns:** The clamped value.

#### `computeRippleUpdates(clips, draggedClipId, proposedStartTime)`

Compute the ripple-mode update for a clip drag on a single lane.
Returns one update per affected clip — at minimum the dragged clip,
plus every clip whose original `startTime` is strictly greater (which
shifts by the same `delta`).

Negative deltas are clamped so no clip's `startTime` goes below 0
(the dragged clip is the limiting factor — later clips can never
cross zero before it does, since they all started later).

```typescript
function computeRippleUpdates(clips: Clip[], draggedClipId: string, proposedStartTime: number): { id: string; startTime: number; }[]
```

- `clips` — All clips on the lane (any order).
- `draggedClipId` — The id of the clip being dragged.
- `proposedStartTime` — The candidate new `startTime` for the dragged clip.

**Returns:** Array of `{ id, startTime }` updates to apply.

#### `computeRulerTicks(duration, pixelsPerSecond)`

Compute time tick marks for the ruler. Picks an interval (1, 2, 5, 10,
30, or 60 seconds, etc.) so that adjacent ticks are at least
`MIN_TICK_PIXEL_SPACING` apart on screen. Always emits a tick at 0 and
stops at the last tick `<= duration`.

```typescript
function computeRulerTicks(duration: number, pixelsPerSecond: number): { time: number; pixel: number; }[]
```

- `duration` — Total duration in seconds.
- `pixelsPerSecond` — Horizontal scale.

**Returns:** Tick descriptors with `{ time, pixel }`.

#### `formatTickTime(seconds)`

Format a tick time for the ruler — `mm:ss` over a minute, `s.s` below.

```typescript
function formatTickTime(seconds: number): string
```

- `seconds` — Time in seconds.

**Returns:** Formatted string for the tick label.

#### `VideoTimeline(props)`

Multi-track video timeline. Composes one `<TrackLane>` per track with
a shared time ruler at the top, a vertical playhead, and a zoom slider
row. Pointer-down on the ruler scrubs `onSeek`; Ctrl+wheel anywhere
over the body changes zoom; the slider is keyboard-accessible.

In `'ripple'` mode (default), dragging a clip on a lane shifts every
subsequent clip on that lane by the same delta — `onClipMove` is
called once per affected clip. In `'insert'` mode, only the dragged
clip moves.

```typescript
function VideoTimeline(props: VideoTimelineProps): JSX.Element
```

- `props` — Component props.

**Returns:** The multi-track timeline element.

#### `zoomFromWheelDelta(current, deltaY, min, max)`

Compute the next zoom value for a Ctrl+wheel notch. Negative `deltaY`
(scroll-up) zooms in; positive zooms out. Result is clamped into
`[min, max]`.

```typescript
function zoomFromWheelDelta(current: number, deltaY: number, min: number, max: number): number
```

- `current` — Current `pixelsPerSecond`.
- `deltaY` — Wheel `deltaY` (sign-only — magnitude is ignored).
- `min` — Lower zoom bound.
- `max` — Upper zoom bound.

**Returns:** The clamped next zoom value.

### Constants

#### `DEFAULT_LANE_HEADER_WIDTH`

Default lane-header column width.

```typescript
const DEFAULT_LANE_HEADER_WIDTH: 120
```

#### `DEFAULT_PIXELS_PER_SECOND`

Default horizontal scale.

```typescript
const DEFAULT_PIXELS_PER_SECOND: 20
```

#### `DEFAULT_RULER_HEIGHT`

Default ruler height.

```typescript
const DEFAULT_RULER_HEIGHT: 28
```

#### `DEFAULT_TRACK_HEIGHT`

Default per-track row height.

```typescript
const DEFAULT_TRACK_HEIGHT: 44
```

#### `DEFAULT_ZOOM_MAX`

Default upper zoom bound.

```typescript
const DEFAULT_ZOOM_MAX: 200
```

#### `DEFAULT_ZOOM_MIN`

Default lower zoom bound.

```typescript
const DEFAULT_ZOOM_MIN: 2
```

#### `MIN_TICK_PIXEL_SPACING`

Minimum spacing (px) between adjacent ruler ticks.

```typescript
const MIN_TICK_PIXEL_SPACING: 60
```

#### `ZOOM_WHEEL_FACTOR`

Multiplier per Ctrl+wheel notch (positive deltaY zooms out).

```typescript
const ZOOM_WHEEL_FACTOR: 1.1
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-feature-track-lane-react` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-feature-track-lane-react`
- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

Ripple mode (default) shifts all later clips on the same lane by the
same delta when a clip is dragged, preserving inter-clip gaps. Switch
to `mode="insert"` to drop the dragged clip at its new position
without disturbing the rest of the lane.

## Translations

Translation strings are provided by `@molecule/app-locales-feature-video-timeline`.
