# @molecule/app-video-player-react

HTML5 video player chrome.

Exports `<VideoPlayer>` — play/pause/scrub/volume/fullscreen with optional captions.

## Quick Start

```tsx
import { VideoPlayer } from '@molecule/app-video-player-react'

<VideoPlayer
  src="https://cdn.example.com/intro.mp4"
  poster="https://cdn.example.com/intro-thumb.jpg"
  captionsSrc="https://cdn.example.com/intro.vtt"
  onEnded={() => markWatched(videoId)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-video-player-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
