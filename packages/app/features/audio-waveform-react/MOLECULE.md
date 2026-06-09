# @molecule/app-feature-audio-waveform-react

Audio waveform — stylized SVG renderer of pre-computed audio peaks
with progress overlay, click-to-seek, and timed region markers.

Used by music-daw, podcast, and music-streaming surfaces to display
a waveform of the underlying audio source. Peak amplitudes must be
computed by the caller (typically offline with `wavesurfer.js`,
`peaks.js`, or an `AudioContext` analysis pass) — this package is
intentionally just the renderer.

## Quick Start

```tsx
import { AudioWaveform } from '@molecule/app-feature-audio-waveform-react'

<AudioWaveform
  peaks={peaks}
  duration={track.duration}
  currentTime={audio.currentTime}
  onSeek={(s) => { audio.currentTime = s }}
  regions={[{ id: 'loop', startTime: 12, duration: 3, color: '#a78bfa55' }]}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-audio-waveform-react
```

## API

### Interfaces

#### `AudioWaveformProps`

AudioWaveform component props.

```typescript
interface AudioWaveformProps {
  /**
   * Pre-computed peak amplitudes in playback order. Each value should
   * be normalized into the closed interval `[0, 1]` (the renderer clamps
   * out-of-range values). One bar is drawn per peak. Callers typically
   * compute these offline with `wavesurfer.js`, `peaks.js`, or an
   * AudioContext analysis pass — this component is just the renderer.
   */
  peaks: number[]
  /**
   * Total duration of the underlying audio in seconds. Used to translate
   * click positions into seek timestamps and to size region overlays.
   * Must be `> 0` for `onSeek` and `regions` to render correctly.
   */
  duration: number
  /**
   * Current playback time in seconds. Drives the progress overlay that
   * fills the waveform from the left up to this point. Defaults to `0`.
   */
  currentTime?: number
  /**
   * Optional click handler called with the seek target time (in
   * seconds) when the user clicks anywhere on the waveform. When
   * omitted, the waveform renders as a non-interactive display.
   */
  onSeek?: (seekTime: number) => void
  /** Optional region markers overlaid on top of the waveform. */
  regions?: WaveformRegion[]
  /** Pixel height of the waveform. Defaults to `64`. */
  height?: number
  /**
   * CSS color used for the progress overlay (the played portion of the
   * waveform). Defaults to a primary accent ink resolved from
   * `currentColor` so callers can theme it via the parent's text color.
   */
  progressColor?: string
  /**
   * CSS color used for the unplayed portion of the waveform. Defaults
   * to a muted ink derived from `currentColor`.
   */
  waveColor?: string
  /** Extra classes merged onto the root element. */
  className?: string
}
```

#### `WaveformRegion`

A timed colored band overlaid on top of the waveform — used to mark
loop ranges, comments, edit selections, chapter spans, etc.

```typescript
interface WaveformRegion {
  /** Stable identifier for the region (used as a React key). */
  id: string
  /** Start of the region, in seconds. */
  startTime: number
  /** Duration of the region, in seconds. Negative / zero hides the region. */
  duration: number
  /**
   * Optional CSS color applied to the region rectangle. Defaults to a
   * semi-transparent accent ink. Use semi-transparent fills so the
   * underlying waveform stays visible.
   */
  color?: string
}
```

### Functions

#### `AudioWaveform(props)`

Stylized SVG audio waveform with click-to-seek + region overlays.
Renders pre-computed peak amplitudes as vertical bars centered on a
baseline. A progress overlay fills the played portion from the left;
region markers render as colored rectangles spanning their time range.

All styling routes through `getClassMap()` (no Tailwind / raw class
names). All user-visible text routes through `t()` so the waveform
translates via the companion
`@molecule/app-locales-feature-audio-waveform` locale bond.

```typescript
function AudioWaveform(props: AudioWaveformProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props.

**Returns:** The audio-waveform element.

#### `clamp(value, min, max)`

Clamp a value into the closed interval `[min, max]`. Returns `min`
for `NaN` / non-finite inputs.

```typescript
function clamp(value: number, min: number, max: number): number
```

- `value` — Value to clamp.
- `min` — Minimum (inclusive).
- `max` — Maximum (inclusive).

**Returns:** The clamped value.

#### `seekTimeFromClick(x, width, duration)`

Compute the seek time (in seconds) for a click at horizontal pixel
`x` inside a waveform bounding box of `width` pixels covering an
audio of `duration` seconds. Clamps the result into `[0, duration]`.

```typescript
function seekTimeFromClick(x: number, width: number, duration: number): number
```

- `x` — Horizontal pixel offset of the click inside the bounding box.
- `width` — Width of the bounding box in pixels.
- `duration` — Total audio duration in seconds.

**Returns:** The seek target time, in seconds.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-feature-audio-waveform`.
