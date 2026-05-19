# @molecule/app-feature-transport-bar-react

Transport bar — play / pause / stop / record / skip / loop controls
for editor playback (music DAW, video editor, animation tool).

Exports `<TransportBar>`. All styling routes through `getClassMap()`
and all button labels translate via the companion
`@molecule/app-locales-feature-transport-bar` locale bond.

## Quick Start

```tsx
import { TransportBar } from '@molecule/app-feature-transport-bar-react'

<TransportBar
  isPlaying={state.playing}
  isRecording={state.recording}
  loop={state.loop}
  onPlayToggle={() => setPlaying(!state.playing)}
  onStop={() => stop()}
  onSkipBack={() => seek(0)}
  onSkipForward={() => seek(end)}
  onRecordToggle={() => setRecording(!state.recording)}
  onLoopToggle={() => setLoop(!state.loop)}
  timeDisplay={`${fmt(state.t)} / ${fmt(state.duration)}`}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-transport-bar-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-feature-transport-bar`.
