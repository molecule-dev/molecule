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
npm install @molecule/app-now-playing-bar-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

Pair with `@molecule/app-locales-now-playing-bar` for translations
in 79 languages. All styling routes through `getClassMap()`; all
user-facing text routes through `t()`.

## Translations

Translation strings are provided by `@molecule/app-locales-now-playing-bar-react`.
