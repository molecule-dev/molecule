# @molecule/app-feature-audio-effects-rack-react

Effects-rack feature for music-DAW and similar audio tools.

Renders a chain of effect panels — bypass toggle, per-param slider
grid, drag-to-reorder via pointer events, add-effect dropdown,
per-panel remove button. Pure UI: callers wire the emitted change
patches + reorder events back into a real audio engine (Tone.js,
the Web Audio API, native `AudioContext`, etc.).

Exports `<AudioEffectsRack>`, the `Effect` / `EffectKind` /
`EffectChangePatch` shapes consumed by callers, the built-in
`EFFECT_KINDS` list and `EFFECT_PARAM_SCHEMAS` registry, and the
`resolveParamValue` / `reorderEffects` helpers used internally.

## Quick Start

```tsx
import {
  AudioEffectsRack,
  type Effect,
} from '@molecule/app-feature-audio-effects-rack-react'

const effects: Effect[] = [
  { id: 'eq-1', kind: 'eq', enabled: true, params: { low: 2, mid: 0, high: -1 } },
  { id: 'rev-1', kind: 'reverb', enabled: true, params: { mix: 0.4, decay: 3 } },
]

<AudioEffectsRack
  effects={effects}
  onChange={(patch) => engine.applyEffectPatch(patch)}
  onReorder={(next) => engine.applyEffectOrder(next)}
  onAdd={(kind) => engine.addEffect(kind)}
  onRemove={(id) => engine.removeEffect(id)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-feature-audio-effects-rack-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

All user-visible text routes through the companion locale bond
`@molecule/app-locales-feature-audio-effects-rack-react`. Styling
routes through `getClassMap()` from `@molecule/app-ui` — no
Tailwind utility class names appear in this package.

## Translations

Translation strings are provided by `@molecule/app-locales-feature-audio-effects-rack-react`.
