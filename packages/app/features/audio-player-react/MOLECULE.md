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
npm install @molecule/app-audio-player-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
