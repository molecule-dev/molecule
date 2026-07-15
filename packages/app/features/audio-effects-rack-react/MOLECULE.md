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
npm install @molecule/app-feature-audio-effects-rack-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `AudioEffectsRackProps`

Props for `<AudioEffectsRack>`.

```typescript
interface AudioEffectsRackProps {
  /** Effects rendered as panels from left to right (or top to bottom on narrow viewports). */
  effects: Effect[]
  /**
   * Called for every per-effect change with a partial patch describing
   * which field moved. Bypass emits a single patch on click; param
   * sliders emit a stream of patches as the user drags.
   */
  onChange?: (patch: EffectChangePatch) => void
  /**
   * Called when the user reorders effects (drag-to-reorder via pointer
   * events) with the new full ordering. The caller is expected to apply
   * the new order to its source-of-truth state.
   */
  onReorder?: (nextOrder: Effect[]) => void
  /** Called when the user adds a new effect via the add-effect dropdown. */
  onAdd?: (kind: EffectKind) => void
  /** Called when the user removes an effect via the per-panel remove button. */
  onRemove?: (id: string) => void
  /** Extra classes merged onto the root element. */
  className?: string
}
```

#### `Effect`

Single effect node in the chain. Effects are pure data — the rack
renders them as panels but never executes any DSP itself. The
caller is expected to wire the emitted patches/reorders back into
a real audio engine (Tone.js, Web Audio API, native `AudioContext`).

```typescript
interface Effect {
  /** Stable identifier for the effect (used as a React key + handler arg). */
  id: string
  /** Kind of effect — picks the parameter schema + display label. */
  kind: EffectKind
  /** Whether the effect is currently enabled (i.e. NOT bypassed). */
  enabled: boolean
  /** Map of param id → current value. Missing keys fall back to the schema default. */
  params: Record<string, number>
}
```

#### `EffectChangePatch`

Patch describing the changed fields for a single effect-change event.
Always carries the effect id; the touched field is set and the rest
are absent.

```typescript
interface EffectChangePatch {
  /** Effect that changed. */
  id: string
  /** New enabled (bypass-off) state — only set when the bypass toggle moved. */
  enabled?: boolean
  /** Param id that moved — paired with `paramValue`. */
  paramId?: string
  /** New param value — paired with `paramId`. */
  paramValue?: number
}
```

#### `EffectParamSchema`

Parameter schema entry — a single named knob on an effect panel.
`min` / `max` define the closed slider interval, `step` is the
granularity of the underlying range input, and `default` is the
value used when an effect is created without an explicit value for
this param.

```typescript
interface EffectParamSchema {
  /** Stable parameter id used as the key inside `Effect.params`. */
  id: string
  /** Lowest allowed value. */
  min: number
  /** Highest allowed value. */
  max: number
  /** Slider step granularity. */
  step: number
  /** Default value when the param is missing on an effect. */
  default: number
}
```

### Types

#### `EffectKind`

Built-in catalog of effect kinds the rack knows how to render. Each
entry has its own parameter schema in {@link EFFECT_PARAM_SCHEMAS}.

```typescript
type EffectKind =
  | 'eq'
  | 'compressor'
  | 'reverb'
  | 'delay'
  | 'distortion'
  | 'gate'
  | 'limiter'
  | 'chorus'
  | 'flanger'
  | 'phaser'
```

### Functions

#### `AudioEffectsRack(props)`

Multi-effect rack — renders one panel per effect in chain order.
Each panel exposes a bypass toggle, a per-param slider grid, and a
remove button. A header dropdown lets the user add a new effect of
any built-in kind. Drag-to-reorder is implemented via native
pointer events — pick up a panel by its drag handle, drop it
before/after another panel, and `onReorder` fires with the new
full ordering.

Pure UI: callers wire the emitted change patches + reorder events
back into whatever audio engine they want (Tone.js, the Web Audio
API, native `AudioContext`, etc.). Styling routes through
`getClassMap()` from `@molecule/app-ui` and all user-visible text
routes through `t()` via the companion locale bond
`@molecule/app-locales-feature-audio-effects-rack`.

```typescript
function AudioEffectsRack(props: AudioEffectsRackProps): JSX.Element
```

- `props` — Component props.

**Returns:** The rack element.

#### `reorderEffects(effects, fromIndex, toIndex)`

Reorder a list of effects by moving the entry at `fromIndex` to
`toIndex`. Returns a new array; the input is never mutated. Indices
outside the array bounds are clamped, so reorder-from-drop logic
doesn't have to worry about edge cases.

```typescript
function reorderEffects(effects: Effect[], fromIndex: number, toIndex: number): Effect[]
```

- `effects` — The original ordering.
- `fromIndex` — Index of the effect being moved.
- `toIndex` — Target index after the move.

**Returns:** A new array with the effect moved into position.

#### `resolveParamValue(effect, schema)`

Resolve the current value of a param on an effect, falling back to
the schema default when the effect's `params` map is missing the
key. Out-of-range / non-finite values are clamped into `[min, max]`.

```typescript
function resolveParamValue(effect: Effect, schema: EffectParamSchema): number
```

- `effect` — The effect whose param to read.
- `schema` — The schema entry describing the param.

**Returns:** The clamped current value (or the schema default).

### Constants

#### `EFFECT_KINDS`

Ordered list of every effect kind the rack supports.

```typescript
const EFFECT_KINDS: readonly EffectKind[]
```

#### `EFFECT_PARAM_SCHEMAS`

Default parameter schemas for the built-in effect kinds. Each entry
is a small, opinionated set of knobs that maps onto common DSP
controls — values are normalized into ranges that are easy to wire
to engines like Tone.js without further mapping.

```typescript
const EFFECT_PARAM_SCHEMAS: Record<EffectKind, readonly EffectParamSchema[]>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

All user-visible text routes through the companion locale bond
`@molecule/app-locales-feature-audio-effects-rack`. Styling
routes through `getClassMap()` from `@molecule/app-ui` — no
Tailwind utility class names appear in this package.

## Translations

Translation strings are provided by `@molecule/app-locales-feature-audio-effects-rack`.
