# @molecule/app-feature-transport-bar-react

Transport bar — play / pause / stop / record / skip / loop controls
for editor playback (music DAW, video editor, animation tool).

Exports `<TransportBar>`. All styling routes through `getClassMap()`
and all button labels translate via the companion
`@molecule/app-locales-feature-transport-bar` locale bond.

## Quick Start

```tsx
import { TransportBar } from '@molecule/app-feature-transport-bar-react'

<TransportBar
  isPlaying={state.playing}
  isRecording={state.recording}
  loop={state.loop}
  onPlayToggle={() => setPlaying(!state.playing)}
  onStop={() => stop()}
  onSkipBack={() => seek(0)}
  onSkipForward={() => seek(end)}
  onRecordToggle={() => setRecording(!state.recording)}
  onLoopToggle={() => setLoop(!state.loop)}
  timeDisplay={`${fmt(state.t)} / ${fmt(state.duration)}`}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-transport-bar-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `TransportBarProps`

Transport-bar component props.

```typescript
interface TransportBarProps {
  /**
   * Whether playback is currently running. Drives the play / pause toggle
   * button's icon, label, and `aria-pressed` state.
   */
  isPlaying: boolean
  /**
   * Whether recording is currently armed / running. When defined, the
   * record button is rendered. Drives the record button's icon, label,
   * and `aria-pressed` state.
   */
  isRecording?: boolean
  /**
   * Whether the stop button is enabled. When `false`, the button still
   * renders but is `disabled` (use this to communicate that there is
   * nothing to stop). Defaults to `true` when omitted.
   */
  canStop?: boolean
  /**
   * Whether the skip-back / skip-forward buttons are enabled. When
   * `false`, the buttons still render but are `disabled`. Defaults to
   * `true` when omitted. Skip buttons only render when their respective
   * `onSkipBack` / `onSkipForward` handlers are provided.
   */
  canSkip?: boolean
  /**
   * Whether loop playback is currently engaged. When defined, the loop
   * toggle button is rendered. Drives the loop button's `aria-pressed`
   * state.
   */
  loop?: boolean
  /** Toggle play / pause. Required. */
  onPlayToggle: () => void
  /** Stop playback (resets to start). Required. */
  onStop: () => void
  /** Skip to the previous marker / start of clip. Optional. */
  onSkipBack?: () => void
  /** Skip to the next marker / end of clip. Optional. */
  onSkipForward?: () => void
  /** Toggle record mode. Optional — when omitted no record button is rendered. */
  onRecordToggle?: () => void
  /** Toggle loop mode. Optional — when omitted no loop button is rendered. */
  onLoopToggle?: () => void
  /**
   * Optional time-display slot rendered alongside the controls (typical
   * use: `current / total` time). Takes precedence over `children`.
   */
  timeDisplay?: ReactNode
  /**
   * Optional time-display slot. Equivalent to `timeDisplay` — provided
   * for ergonomic JSX nesting. Ignored when `timeDisplay` is set.
   */
  children?: ReactNode
  /** Extra classes merged onto the root element. */
  className?: string
}
```

### Functions

#### `TransportBar(props)`

Transport-control bar (play / pause / stop / record / skip / loop)
used by music-daw + video-editor surfaces for editor playback
control. Renders a horizontal bar of buttons with semantic icons and
fully translated `aria-label`s; an optional time-display slot lets
callers render the current playhead position / total duration without
coupling the bar to any specific time-format library.

All styling routes through `getClassMap()` (no Tailwind / raw class
names). All user-visible text (button labels) routes through `t()`
via the companion `@molecule/app-locales-feature-transport-bar`
locale bond.

```typescript
function TransportBar(props: TransportBarProps): JSX.Element
```

- `props` — Component props.

**Returns:** The transport-bar element.

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

Translation strings are provided by `@molecule/app-locales-feature-transport-bar`.
