# @molecule/app-feature-audio-waveform-react

Audio waveform — stylized SVG renderer of pre-computed audio peaks
with progress overlay, click-to-seek, and timed region markers.

Used by music-daw, podcast, and music-streaming surfaces to display
a waveform of the underlying audio source. Peak amplitudes must be
computed by the caller (typically offline with `wavesurfer.js`,
`peaks.js`, or an `AudioContext` analysis pass) — this package is
intentionally just the renderer.

## Quick Start

```tsx
import { AudioWaveform } from '@molecule/app-feature-audio-waveform-react'

<AudioWaveform
  peaks={peaks}
  duration={track.duration}
  currentTime={audio.currentTime}
  onSeek={(s) => { audio.currentTime = s }}
  regions={[{ id: 'loop', startTime: 12, duration: 3, color: '#a78bfa55' }]}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-audio-waveform-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-feature-audio-waveform-react`.
