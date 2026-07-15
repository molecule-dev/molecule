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
npm install @molecule/app-video-player-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `VideoPlayer(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .src
- `root0` — .poster
- `root0` — .captionsSrc
- `root0` — .captionsLang
- `root0` — .autoPlay
- `root0` — .defaultMuted
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
