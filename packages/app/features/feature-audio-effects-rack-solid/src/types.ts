/**
 * Types for the Solid multi-effect rack — the Solid counterparts of the shapes
 * `@molecule/app-feature-audio-effects-rack-react` exports.
 *
 * @module
 */

/**
 * Built-in catalog of effect kinds the rack knows how to render. Each
 * entry has its own parameter schema in `EFFECT_PARAM_SCHEMAS`.
 */
export type EffectKind =
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

/**
 * Parameter schema entry — a single named knob on an effect panel.
 * `min` / `max` define the closed slider interval, `step` is the
 * granularity of the underlying range input, and `default` is the
 * value used when an effect is created without an explicit value for
 * this param.
 */
export interface EffectParamSchema {
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

/**
 * Single effect node in the chain. Effects are pure data — the rack
 * renders them as panels but never executes any DSP itself. The
 * caller is expected to wire the emitted patches/reorders back into
 * a real audio engine (Tone.js, Web Audio API, native `AudioContext`).
 */
export interface Effect {
  /** Stable identifier for the effect (used as the list key + handler arg). */
  id: string
  /** Kind of effect — picks the parameter schema + display label. */
  kind: EffectKind
  /** Whether the effect is currently enabled (i.e. NOT bypassed). */
  enabled: boolean
  /** Map of param id → current value. Missing keys fall back to the schema default. */
  params: Record<string, number>
}

/**
 * Patch describing the changed fields for a single effect-change event.
 * Always carries the effect id; the touched field is set and the rest
 * are absent.
 */
export interface EffectChangePatch {
  /** Effect that changed. */
  id: string
  /** New enabled (bypass-off) state — only set when the bypass toggle moved. */
  enabled?: boolean
  /** Param id that moved — paired with `paramValue`. */
  paramId?: string
  /** New param value — paired with `paramId`. */
  paramValue?: number
}

/** Props accepted by the `AudioEffectsRack` component. */
export interface AudioEffectsRackProps {
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
