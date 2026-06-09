# @molecule/app-feature-video-scrubber-react

Frame-accurate video scrubber for video-editor — timeline strip with
thumbnail filmstrip, vertical playhead, frame-by-frame keyboard
stepping (Shift = ±1 second), and an optional frame-number readout.

Composes well with `<VideoTimeline>` from
`@molecule/app-feature-video-timeline-react` — the scrubber shows
preview thumbnails and frame-precision controls; the timeline shows
multi-track structure.

Exports `<VideoScrubber>`, the `Thumbnail` and `VideoScrubberProps`
types, the default constants, and the pure helpers `timeToFrame`,
`frameToTime`, `snapTimeToFrame`, `computeFilmstripTicks`,
`selectClosestThumbnail`, and `formatFrameNumber`.

## Quick Start

```tsx
import { VideoScrubber } from '@molecule/app-feature-video-scrubber-react'

<VideoScrubber
  duration={60}
  currentTime={3.2}
  fps={24}
  thumbnails={[
    { time: 0, src: 'data:image/png;base64,...' },
    { time: 5, src: 'data:image/png;base64,...' },
    { time: 10, src: 'data:image/png;base64,...' },
  ]}
  onSeek={(t) => setCurrentTime(t)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-video-scrubber-react
```

## API

### Interfaces

#### `Thumbnail`

One pre-computed thumbnail at a given time. The scrubber renders a
filmstrip row of thumbnails by picking, for each visible tick, the
provided thumbnail whose `time` is closest. Hosts can supply as few
or as many thumbnails as they like; gaps are filled by repeating the
nearest neighbour.

```typescript
interface Thumbnail {
  /** Time of this thumbnail in seconds. */
  time: number
  /** Image source URL (data: URL or fetched blob URL). */
  src: string
}
```

#### `VideoScrubberProps`

Props for `<VideoScrubber>`. Frame-accurate scrubber widget pairing a
thumbnail filmstrip with a click-to-seek playhead, frame-step keyboard
controls, and an optional frame-number readout.

```typescript
interface VideoScrubberProps {
  /** Total media duration in seconds. */
  duration: number
  /** Current playhead time in seconds. */
  currentTime: number
  /** Frames-per-second used for snapping + frame-step keyboard. Defaults to 24. */
  fps?: number
  /** Pre-computed thumbnails. The scrubber picks the closest one per filmstrip tick. */
  thumbnails?: Thumbnail[]
  /** Called with the seek time (snapped to the nearest frame). */
  onSeek?: (time: number) => void
  /** Whether to show the frame-number readout. Defaults to `true`. */
  showFrameNumber?: boolean
  /** Number of filmstrip cells to render. Defaults to 12. */
  thumbnailCount?: number
  /** Filmstrip cell height in px. Defaults to 48. */
  thumbnailHeight?: number
  /** Optional id for the root element (useful for label associations). */
  id?: string
  /** Extra classes merged onto the root element. */
  className?: string
}
```

### Functions

#### `computeFilmstripTicks(duration, count)`

Compute evenly-spaced filmstrip ticks across `[0, duration]`. Each
tick has a `time` (in seconds) and a `position` (0..1) for layout
via `left: position * 100%`. The first tick is at time 0; the last
tick is at time `duration` (or 0 if `duration <= 0`).

```typescript
function computeFilmstripTicks(duration: number, count: number): { time: number; position: number; }[]
```

- `duration` — Total duration in seconds.
- `count` — Number of ticks. Coerced into `[1, 1000]`.

**Returns:** Array of `{ time, position }` ticks (length === clamped count).

#### `formatFrameNumber(frame)`

Format a frame index for the readout display — fixed-width-friendly
with a leading hash for clarity.

```typescript
function formatFrameNumber(frame: number): string
```

- `frame` — Frame index.

**Returns:** The display string (e.g. `#42`).

#### `frameToTime(frame, fps)`

Convert a frame index back to a time in seconds.

```typescript
function frameToTime(frame: number, fps: number): number
```

- `frame` — Frame index (any integer >= 0).
- `fps` — Frame rate. Must be > 0.

**Returns:** Time in seconds.

#### `selectClosestThumbnail(thumbnails, targetTime)`

Pick the thumbnail whose `time` is closest to a target time. Ties
break toward the earlier thumbnail. Returns `undefined` only when
the input list is empty.

```typescript
function selectClosestThumbnail(thumbnails: Thumbnail[], targetTime: number): Thumbnail | undefined
```

- `thumbnails` — Available thumbnails (any order).
- `targetTime` — The target time in seconds.

**Returns:** The closest thumbnail, or `undefined` if `thumbnails` is empty.

#### `snapTimeToFrame(time, fps, duration)`

Snap a continuous time value to the nearest frame boundary, then
clamp into `[0, duration]`. This is what the scrubber emits via
`onSeek` for click-anywhere scrubbing.

```typescript
function snapTimeToFrame(time: number, fps: number, duration: number): number
```

- `time` — Candidate time in seconds.
- `fps` — Frame rate. Must be > 0.
- `duration` — Maximum time in seconds (clamp upper bound).

**Returns:** Frame-snapped, clamped time in seconds.

#### `timeToFrame(time, fps)`

Convert a continuous time in seconds to a frame index, given a frame
rate. The result is rounded to the nearest integer (i.e. snapped to
the closest frame boundary).

```typescript
function timeToFrame(time: number, fps: number): number
```

- `time` — Time in seconds.
- `fps` — Frame rate. Must be > 0.

**Returns:** Integer frame index (>= 0).

#### `VideoScrubber(props)`

Frame-accurate video scrubber. Renders an evenly-spaced filmstrip of
thumbnail images, a vertical playhead, and an optional frame-number
readout. Click anywhere on the strip to seek (snapped to the nearest
frame); use `←/→` arrows to step ±1 frame, or `Shift+←/→` to step
±1 second. All `onSeek` calls receive frame-snapped times.

Composes well with `<VideoTimeline>` from
`@molecule/app-feature-video-timeline-react` — the scrubber shows
preview thumbnails and frame-precision controls; the timeline shows
multi-track structure.

```typescript
function VideoScrubber(props: VideoScrubberProps): JSX.Element
```

- `props` — Component props.

**Returns:** The scrubber element.

### Constants

#### `DEFAULT_FPS`

Default frame rate (24fps — feature-film standard).

```typescript
const DEFAULT_FPS: 24
```

#### `DEFAULT_THUMBNAIL_COUNT`

Default number of filmstrip cells.

```typescript
const DEFAULT_THUMBNAIL_COUNT: 12
```

#### `DEFAULT_THUMBNAIL_HEIGHT`

Default filmstrip cell height in px.

```typescript
const DEFAULT_THUMBNAIL_HEIGHT: 48
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

`onSeek` is always called with frame-snapped times. Click anywhere on
the filmstrip to seek; press the strip with keyboard focus and use
arrows for ±1 frame, Shift+arrows for ±1 second, PageUp/PageDown for
±10 frames, Home/End to jump to start/end.

## Translations

Translation strings are provided by `@molecule/app-locales-feature-video-scrubber`.
