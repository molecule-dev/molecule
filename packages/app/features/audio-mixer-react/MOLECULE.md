# @molecule/app-feature-audio-mixer-react

Channel-strip mixer console for music-DAW and similar audio tools.

Renders one column per channel — name header, vertical fader, pan
knob, mute/solo buttons, optional sends row — plus an optional
master column. Pure UI: callers wire the emitted change patches
back to a real audio engine (Tone.js, the Web Audio API, native
`AudioContext`, etc.).

Exports `<AudioMixer>`, the `Channel` / `Send` / `ChannelChangePatch`
shapes consumed by callers, the `MIN_LEVEL` / `MAX_LEVEL` / `MIN_PAN`
/ `MAX_PAN` constants, and the `clampLevel` / `clampPan` helpers
used internally to constrain user input.

## Quick Start

```tsx
import { AudioMixer } from '@molecule/app-feature-audio-mixer-react'

<AudioMixer
  channels={[
    { id: 'drums', name: 'Drums', level: 0.8, pan: -0.2, muted: false, solo: false },
    { id: 'bass', name: 'Bass', level: 0.7, pan: 0, muted: false, solo: false },
  ]}
  master={{ id: 'master', name: 'Master', level: 0.9, pan: 0, muted: false, solo: false }}
  onChannelChange={(patch) => engine.applyChannelPatch(patch)}
  onMasterChange={(patch) => engine.applyChannelPatch(patch)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-audio-mixer-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

All user-visible text routes through the companion locale bond
`@molecule/app-locales-feature-audio-mixer-react`. Styling routes
through `getClassMap()` from `@molecule/app-ui` — no Tailwind
utility class names appear in this package.

## Translations

Translation strings are provided by `@molecule/app-locales-feature-audio-mixer-react`.
