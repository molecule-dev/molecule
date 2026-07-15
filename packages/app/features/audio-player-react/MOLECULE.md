# @molecule/app-audio-player-react

HTML5 audio player.

Exports `<AudioPlayer>`.

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

### Functions

#### `AudioPlayer(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .src
- `root0` — .title
- `root0` — .subtitle
- `root0` — .visualizer
- `root0` — .defaultMuted
- `root0` — .autoPlay
- `root0` — .onPlay
- `root0` — .onPause
- `root0` — .onEnded
- `root0` — .className

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
