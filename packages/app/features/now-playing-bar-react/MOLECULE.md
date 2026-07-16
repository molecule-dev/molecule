# @molecule/app-now-playing-bar-react

Persistent now-playing bar — track artwork, title/artist, transport
controls (prev/play-pause/next), scrubber, and volume slider.

Used by music-streaming, podcast, and audiobook apps as a sticky
dock at the bottom of the page (or panel) showing what's currently
playing.

Sticky positioning is intentionally NOT enforced inside the component —
the caller wraps `<NowPlayingBar>` in their own `position: sticky` /
`position: fixed` container at whatever scope makes sense (page,
layout shell, panel).

## Quick Start

```tsx
import { NowPlayingBar } from '@molecule/app-now-playing-bar-react'

<div style={{ position: 'sticky', bottom: 0 }}>
  <NowPlayingBar
    track={{ id: 't1', title: 'Untitled', artist: 'Various' }}
    isPlaying={playing}
    onPlay={() => setPlaying(true)}
    onPause={() => setPlaying(false)}
    currentTime={time}
    duration={duration}
    onSeek={setTime}
    volume={vol}
    onVolumeChange={setVol}
  />
</div>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-now-playing-bar-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `NowPlayingBarProps`

Now-playing bar component props.

```typescript
interface NowPlayingBarProps {
  /** The currently loaded track. REQUIRED — render the bar conditionally
   *  (`{track ? <NowPlayingBar track={track} ... /> : null}`) when nothing
   *  is playing; passing null/undefined crashes. */
  track: NowPlayingTrack
  /** True when the track is actively playing. Drives the play/pause toggle. */
  isPlaying: boolean
  /** Called when the user presses play. */
  onPlay: () => void
  /** Called when the user presses pause. */
  onPause: () => void
  /** Optional next-track handler. When omitted the next button is hidden. */
  onNext?: () => void
  /** Optional previous-track handler. When omitted the previous button is hidden. */
  onPrev?: () => void
  /** Current playback position in seconds. */
  currentTime: number
  /** Total track duration in seconds. */
  duration: number
  /** Called when the user scrubs to a new position (in seconds). */
  onSeek: (seconds: number) => void
  /** Volume level in `[0, 1]`. Optional — when omitted the volume control is hidden. */
  volume?: number
  /** Called when the volume slider changes (in `[0, 1]`). Required to render the volume control. */
  onVolumeChange?: (volume: number) => void
  /** Optional slot rendered at the right edge (e.g. queue button, share button). */
  trailing?: ReactNode
  /** Extra classes merged onto the root element. */
  className?: string
}
```

#### `NowPlayingTrack`

A track currently loaded in the now-playing bar. Only `id`, `title`, and
`artist` are required; `artwork` is an optional image URL displayed on the
left edge of the bar.

```typescript
interface NowPlayingTrack {
  /** Stable identifier for the track (used as a React key by parent lists). */
  id: string
  /** Track title shown as the primary label in the bar. */
  title: string
  /** Artist / podcast / source label shown below the title. */
  artist: string
  /** Optional artwork image URL (square). */
  artwork?: string
}
```

### Functions

#### `formatTime(seconds)`

Format a number of seconds as `m:ss` (or `0:00` for non-finite input).

```typescript
function formatTime(seconds: number): string
```

- `seconds` — Seconds to format.

**Returns:** The formatted `m:ss` string.

#### `NowPlayingBar(props)`

Persistent now-playing bar: track artwork, title/artist, transport controls
(prev/play-pause/next), scrubber, and volume slider. Used by
music-streaming, podcast, audiobook, and "what's playing" UIs.

Sticky positioning is intentionally NOT enforced inside the component — the
caller decides where it lives. Common pattern: wrap the bar in a parent
container styled with `cm.position('sticky')` (or `cm.position('fixed')`)
plus `bottom: 0` and a `z-index`, so the same bar can serve as a
page-level dock or a panel-level chrome without changing this component.

All styling routes through `getClassMap()` (no Tailwind / raw class
names). All user-visible text routes through `t()` so the bar
translates via the companion `@molecule/app-locales-now-playing-bar`
locale bond.

```typescript
function NowPlayingBar(props: NowPlayingBarProps): JSX.Element
```

- `props` — Component props.

**Returns:** The now-playing bar element.

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

Pair with `@molecule/app-locales-now-playing-bar` for translations
in 79 languages. All styling routes through `getClassMap()`; all
user-facing text routes through `t()`.

`track` is REQUIRED — hide the bar (conditional render) when nothing
is playing; the component does not accept null. Requires a wired
ClassMap bond and a React `I18nProvider` ancestor — `getClassMap()`
and `useTranslation()` both throw before wiring. Transport buttons
render text glyphs (not an icon set), so their size tracks the app
font.

## Translations

Translation strings are provided by `@molecule/app-locales-now-playing-bar`.
