# @molecule/app-video-player-react

HTML5 video player chrome.

Exports `<VideoPlayer>` — a `<video>` element wrapped with custom
ClassMap-styled controls: play/pause, scrub bar, elapsed/total time,
mute toggle, fullscreen, optional caption track.

## Quick Start

```tsx
import { VideoPlayer } from '@molecule/app-video-player-react'

<VideoPlayer
  src="https://cdn.example.com/intro.mp4"
  poster="https://cdn.example.com/intro-thumb.jpg"
  captionsSrc="https://cdn.example.com/intro.vtt"
  onEnded={() => console.log('watched to the end')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-video-player-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `VideoPlayerProps`

Props for the {@link VideoPlayer} component.

```typescript
interface VideoPlayerProps {
  /** Video URL. */
  src: string
  /** Optional poster image URL. */
  poster?: string
  /** Caption track URL (.vtt). */
  captionsSrc?: string
  /** Caption language code. */
  captionsLang?: string
  /** Autoplay (must be muted to work in most browsers). */
  autoPlay?: boolean
  /** Initial muted state. */
  defaultMuted?: boolean
  /** Called on play/pause/end events. */
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `VideoPlayer(props)`

HTML5 video player with custom chrome — play/pause, scrub bar,
elapsed/total time, mute, fullscreen. Native controls are hidden so
the bar styles match the rest of the app (via ClassMap).

```typescript
function VideoPlayer({
  src,
  poster,
  captionsSrc,
  captionsLang = 'en',
  autoPlay,
  defaultMuted,
  onPlay,
  onPause,
  onEnded,
  className,
}: VideoPlayerProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — Component props (see {@link VideoPlayerProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

Renders its own `<video>` element directly — it does NOT use
`@molecule/app-video`'s provider system; reach for that package when you
need an imperative, provider-swappable player. Volume control is a MUTE
TOGGLE only (no slider), and there is no PiP / playback-rate / quality
UI. Buttons use emoji glyphs (▶ ⏸ 🔇 🔊 ⛶). Only the Play/Pause labels
go through `t('video.play')` / `t('video.pause')`; the 'Seek',
'Mute'/'Unmute' and 'Fullscreen' aria-labels are hardcoded English (the
on-disk `@molecule/app-locales-video-player` bond carries only the two
play/pause keys and is not registered yet). `autoPlay` also forces the
initial state to muted (browser autoplay policy); `captionsLang`
defaults to 'en'. Single `src` URL only — no multi-source/quality list.
Props (documented on the exported `VideoPlayerProps` interface): src,
poster, captionsSrc, captionsLang, autoPlay, defaultMuted, onPlay,
onPause, onEnded, className.

## Translations

Translation strings are provided by `@molecule/app-locales-video-player`.
