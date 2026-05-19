# @molecule/app-feature-video-scrubber-react

Frame-accurate video scrubber for video-editor — timeline strip with
thumbnail filmstrip, vertical playhead, frame-by-frame keyboard
stepping (Shift = ±1 second), and an optional frame-number readout.

Composes well with `<VideoTimeline>` from
`@molecule/app-feature-video-timeline-react` — the scrubber shows
preview thumbnails and frame-precision controls; the timeline shows
multi-track structure.

Exports `<VideoScrubber>`, the `Thumbnail` and `VideoScrubberProps`
types, the default constants, and the pure helpers `timeToFrame`,
`frameToTime`, `snapTimeToFrame`, `computeFilmstripTicks`,
`selectClosestThumbnail`, and `formatFrameNumber`.

## Quick Start

```tsx
import { VideoScrubber } from '@molecule/app-feature-video-scrubber-react'

<VideoScrubber
  duration={60}
  currentTime={3.2}
  fps={24}
  thumbnails={[
    { time: 0, src: 'data:image/png;base64,...' },
    { time: 5, src: 'data:image/png;base64,...' },
    { time: 10, src: 'data:image/png;base64,...' },
  ]}
  onSeek={(t) => setCurrentTime(t)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-video-scrubber-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

`onSeek` is always called with frame-snapped times. Click anywhere on
the filmstrip to seek; press the strip with keyboard focus and use
arrows for ±1 frame, Shift+arrows for ±1 second, PageUp/PageDown for
±10 frames, Home/End to jump to start/end.

## Translations

Translation strings are provided by `@molecule/app-locales-feature-video-scrubber`.
