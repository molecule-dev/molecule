# @molecule/app-audio-player-react

HTML5 audio player chrome — play/pause, scrub bar, elapsed/total time,
and a mute toggle, over a hidden `<audio>` element. Use for podcasts,
voice notes, music previews, narrated lessons.

## Quick Start

```tsx
import { AudioPlayer } from '@molecule/app-audio-player-react'

<AudioPlayer
  src="/audio/episode-42.mp3"
  title="Episode 42: Getting Started"
  subtitle="The Molecule Podcast"
  onPlay={() => console.log('playing')}
  onEnded={() => console.log('finished')}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-audio-player-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `AudioPlayerProps`

```typescript
interface AudioPlayerProps {
  src: string
  /** Optional title / track name. */
  title?: ReactNode
  /** Optional artist / source label. */
  subtitle?: ReactNode
  /** Optional waveform / visualizer slot rendered above the controls. */
  visualizer?: ReactNode
  /** Initial muted state. */
  defaultMuted?: boolean
  /** Autoplay (browser may block). */
  autoPlay?: boolean
  /** Callbacks. */
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `AudioPlayer(props)`

HTML5 audio player chrome — play/pause, scrub, time, mute, optional
visualizer slot. Use for podcasts, voice notes, music previews,
narrated lessons.

```typescript
function AudioPlayer({
  src,
  title,
  subtitle,
  visualizer,
  defaultMuted,
  autoPlay,
  onPlay,
  onPause,
  onEnded,
  className,
}: AudioPlayerProps): JSX.Element
```

- `props` — Component props (see {@link AudioPlayerProps}).

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

There is NO volume slider — only a mute toggle; and no playback-rate
or skip controls. The optional `visualizer` prop is a free-form node
slot rendered above the controls (bring your own waveform). `autoPlay`
is passed to the `<audio>` element and is routinely blocked by
browsers until user interaction — never rely on it. Duration renders
`0:00` until `loadedmetadata` fires (`preload="metadata"`).
Translations come from the companion `@molecule/app-locales-audio-player`
locale bond.

## Translations

Translation strings are provided by `@molecule/app-locales-audio-player`.
