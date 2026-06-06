# @molecule/app-feature-track-lane-react

Horizontal track-lane primitive for multi-track timelines (music DAW,
video editor, animation tool). Renders one lane row of draggable +
resizable clip blocks on a `pixelsPerSecond` time axis.

Exports `<TrackLane>` and the `Clip` type, plus the pure-function
helpers `clipToPixels`, `pixelsToTime`, and `clampClipMove` that
back the pointer-event drag/resize math.

## Quick Start

```tsx
import { TrackLane } from '@molecule/app-feature-track-lane-react'

<TrackLane
  name="Drums"
  clips={[
    { id: 'a', startTime: 0, duration: 2, color: '#0af', label: 'Kick' },
    { id: 'b', startTime: 4, duration: 1.5, label: 'Snare' },
  ]}
  pixelsPerSecond={20}
  onClipMove={(id, t) => updateClip(id, { startTime: t })}
  onClipResize={(id, d) => updateClip(id, { duration: d })}
  onClipClick={(id) => setSelected(id)}
  selectedClipId={selected}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-track-lane-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-feature-track-lane-react`.
