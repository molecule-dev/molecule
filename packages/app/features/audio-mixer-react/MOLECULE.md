# @molecule/app-feature-audio-mixer-react

Channel-strip mixer console for music-DAW and similar audio tools.

Renders one column per channel — name header, vertical fader, pan
knob, mute/solo buttons, optional sends row — plus an optional
master column. Pure UI: callers wire the emitted change patches
back to a real audio engine (Tone.js, the Web Audio API, native
`AudioContext`, etc.).

Exports `<AudioMixer>`, the `Channel` / `Send` / `ChannelChangePatch`
shapes consumed by callers, the `MIN_LEVEL` / `MAX_LEVEL` / `MIN_PAN`
/ `MAX_PAN` constants, and the `clampLevel` / `clampPan` helpers
used internally to constrain user input.

## Quick Start

```tsx
import { AudioMixer } from '@molecule/app-feature-audio-mixer-react'

<AudioMixer
  channels={[
    { id: 'drums', name: 'Drums', level: 0.8, pan: -0.2, muted: false, solo: false },
    { id: 'bass', name: 'Bass', level: 0.7, pan: 0, muted: false, solo: false },
  ]}
  master={{ id: 'master', name: 'Master', level: 0.9, pan: 0, muted: false, solo: false }}
  onChannelChange={(patch) => engine.applyChannelPatch(patch)}
  onMasterChange={(patch) => engine.applyChannelPatch(patch)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-audio-mixer-react
```

## API

### Interfaces

#### `AudioMixerProps`

Props for `<AudioMixer>`.

```typescript
interface AudioMixerProps {
  /** Channels rendered as columns from left to right. Order is preserved. */
  channels: Channel[]
  /**
   * Called for every user-initiated change with a partial patch
   * describing which field moved. Faders/knobs emit a stream of
   * patches as the user drags; mute/solo emit a single patch on
   * click.
   */
  onChannelChange?: (patch: ChannelChangePatch) => void
  /**
   * Optional master channel — rendered as a final, visually-separated
   * column. The master strip omits the sends row but otherwise
   * behaves like a regular channel.
   */
  master?: Channel
  /**
   * Called when the master channel changes (only fires when `master`
   * is supplied). Same patch shape as `onChannelChange`.
   */
  onMasterChange?: (patch: ChannelChangePatch) => void
  /** Pixel height of the fader column. Defaults to 180. */
  faderHeight?: number
  /** Extra classes merged onto the root element. */
  className?: string
}
```

#### `Channel`

One channel strip on the mixer console. The mixer is purely
presentational — `level` and `pan` are projected onto a fader and
pan knob, and the caller is expected to wire `onChannelChange`
callbacks back to a real audio engine (e.g. Tone.js, the Web Audio
API, native `AudioContext`).

```typescript
interface Channel {
  /** Stable identifier for the channel (used as a React key + handler arg). */
  id: string
  /** Channel display name (already localized by the caller, if needed). */
  name: string
  /** Fader level in the closed interval `[0, 1]`. */
  level: number
  /** Pan position in the closed interval `[-1, 1]` (left to right). */
  pan: number
  /** Whether the channel is currently muted. */
  muted: boolean
  /** Whether the channel is currently solo'd. */
  solo: boolean
  /** Optional sends row (post-fader auxiliary sends). */
  sends?: Send[]
  /**
   * Optional accent color for the channel header strip. When omitted
   * the header uses an inherited text color so it adapts to themes.
   */
  color?: string
}
```

#### `ChannelChangePatch`

Patch describing the changed fields for a single channel-change
event. Always carries the channel id; the touched field is set to
its new value and the rest are absent. `sendId` + `sendLevel` are
used together when a send fader moved.

```typescript
interface ChannelChangePatch {
  /** Channel that changed. */
  id: string
  /** New fader level (only set when the main fader moved). */
  level?: number
  /** New pan position (only set when the pan knob moved). */
  pan?: number
  /** New mute state (only set when the mute button toggled). */
  muted?: boolean
  /** New solo state (only set when the solo button toggled). */
  solo?: boolean
  /** Send id (only set together with `sendLevel`). */
  sendId?: string
  /** New send level (only set together with `sendId`). */
  sendLevel?: number
}
```

#### `Send`

A single send target on a channel — points at another channel/bus by
id and carries a 0..1 send level. The mixer renders sends as a small
row of compact level controls under the channel strip.

```typescript
interface Send {
  /** Stable identifier for the send (used as a React key + handler arg). */
  id: string
  /**
   * Optional human-readable target label. When omitted the mixer falls
   * back to the send id for accessibility. Locale bonds typically don't
   * translate this — it's user-authored bus naming.
   */
  label?: string
  /** Send level in the closed interval `[0, 1]`. Out-of-range clamps. */
  level: number
}
```

### Functions

#### `AudioMixer(props)`

Multi-channel mixer console. Renders one column per channel —
name, vertical fader, pan knob, mute/solo buttons, optional sends
row — plus an optional master column. Pure UI; the caller wires
the emitted change patches back to whatever audio engine they
want (Tone.js, the Web Audio API, native `AudioContext`, etc.).

Styling routes through `getClassMap()` and all user-visible text
routes through `t()` via the companion locale bond
`@molecule/app-locales-feature-audio-mixer`.

```typescript
function AudioMixer(props: AudioMixerProps): JSX.Element
```

- `props` — Component props.

**Returns:** The mixer element.

#### `clampLevel(value)`

Clamp a fader/send level into the closed interval `[0, 1]`. Returns
`0` for non-finite inputs.

```typescript
function clampLevel(value: number): number
```

- `value` — Candidate level.

**Returns:** The clamped level.

#### `clampPan(value)`

Clamp a pan position into the closed interval `[-1, 1]`. Returns `0`
(center) for non-finite inputs.

```typescript
function clampPan(value: number): number
```

- `value` — Candidate pan position.

**Returns:** The clamped pan position.

### Constants

#### `MAX_LEVEL`

Maximum allowed fader level.

```typescript
const MAX_LEVEL: 1
```

#### `MAX_PAN`

Maximum allowed pan position (full right).

```typescript
const MAX_PAN: 1
```

#### `MIN_LEVEL`

Minimum allowed fader level.

```typescript
const MIN_LEVEL: 0
```

#### `MIN_PAN`

Minimum allowed pan position (full left).

```typescript
const MIN_PAN: -1
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

All user-visible text routes through the companion locale bond
`@molecule/app-locales-feature-audio-mixer`. Styling routes
through `getClassMap()` from `@molecule/app-ui` — no Tailwind
utility class names appear in this package.

## Translations

Translation strings are provided by `@molecule/app-locales-feature-audio-mixer`.
