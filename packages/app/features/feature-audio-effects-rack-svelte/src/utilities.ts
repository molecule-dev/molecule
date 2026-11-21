/**
 * The rack's pure exports — the built-in kind list, the parameter-schema
 * registry and the two helpers — for the Svelte multi-effect rack. These are
 * plain data and functions, identical to the React package's.
 *
 * @module
 */

import type { Effect, EffectKind, EffectParamSchema } from './types.js'

/** Ordered list of every effect kind the rack supports. */
export const EFFECT_KINDS: readonly EffectKind[] = [
  'eq',
  'compressor',
  'reverb',
  'delay',
  'distortion',
  'gate',
  'limiter',
  'chorus',
  'flanger',
  'phaser',
] as const

/**
 * Default parameter schemas for the built-in effect kinds. Each entry
 * is a small, opinionated set of knobs that maps onto common DSP
 * controls — values are normalized into ranges that are easy to wire
 * to engines like Tone.js without further mapping.
 */
export const EFFECT_PARAM_SCHEMAS: Record<EffectKind, readonly EffectParamSchema[]> = {
  eq: [
    { id: 'low', min: -24, max: 24, step: 0.5, default: 0 },
    { id: 'mid', min: -24, max: 24, step: 0.5, default: 0 },
    { id: 'high', min: -24, max: 24, step: 0.5, default: 0 },
  ],
  compressor: [
    { id: 'threshold', min: -60, max: 0, step: 0.5, default: -24 },
    { id: 'ratio', min: 1, max: 20, step: 0.1, default: 4 },
    { id: 'attack', min: 0, max: 1, step: 0.001, default: 0.003 },
    { id: 'release', min: 0, max: 1, step: 0.001, default: 0.25 },
  ],
  reverb: [
    { id: 'mix', min: 0, max: 1, step: 0.01, default: 0.3 },
    { id: 'decay', min: 0.1, max: 10, step: 0.1, default: 2 },
    { id: 'predelay', min: 0, max: 0.5, step: 0.001, default: 0.01 },
  ],
  delay: [
    { id: 'time', min: 0, max: 2, step: 0.001, default: 0.25 },
    { id: 'feedback', min: 0, max: 0.95, step: 0.01, default: 0.4 },
    { id: 'mix', min: 0, max: 1, step: 0.01, default: 0.3 },
  ],
  distortion: [
    { id: 'drive', min: 0, max: 1, step: 0.01, default: 0.4 },
    { id: 'tone', min: 0, max: 1, step: 0.01, default: 0.5 },
    { id: 'mix', min: 0, max: 1, step: 0.01, default: 1 },
  ],
  gate: [
    { id: 'threshold', min: -80, max: 0, step: 0.5, default: -40 },
    { id: 'attack', min: 0, max: 1, step: 0.001, default: 0.005 },
    { id: 'release', min: 0, max: 1, step: 0.001, default: 0.1 },
  ],
  limiter: [
    { id: 'threshold', min: -24, max: 0, step: 0.5, default: -1 },
    { id: 'release', min: 0, max: 1, step: 0.001, default: 0.05 },
  ],
  chorus: [
    { id: 'rate', min: 0.1, max: 10, step: 0.1, default: 1.5 },
    { id: 'depth', min: 0, max: 1, step: 0.01, default: 0.5 },
    { id: 'mix', min: 0, max: 1, step: 0.01, default: 0.5 },
  ],
  flanger: [
    { id: 'rate', min: 0.1, max: 10, step: 0.1, default: 0.5 },
    { id: 'depth', min: 0, max: 1, step: 0.01, default: 0.6 },
    { id: 'feedback', min: 0, max: 0.95, step: 0.01, default: 0.5 },
  ],
  phaser: [
    { id: 'rate', min: 0.1, max: 10, step: 0.1, default: 0.5 },
    { id: 'depth', min: 0, max: 1, step: 0.01, default: 0.5 },
    { id: 'feedback', min: 0, max: 0.95, step: 0.01, default: 0.4 },
  ],
}

/**
 * Resolve the current value of a param on an effect, falling back to
 * the schema default when the effect's `params` map is missing the
 * key. Out-of-range / non-finite values are clamped into `[min, max]`.
 *
 * @param effect - The effect whose param to read.
 * @param schema - The schema entry describing the param.
 * @returns The clamped current value (or the schema default).
 */
export function resolveParamValue(effect: Effect, schema: EffectParamSchema): number {
  const raw = effect.params[schema.id]
  const next = typeof raw === 'number' && Number.isFinite(raw) ? raw : schema.default
  if (next < schema.min) return schema.min
  if (next > schema.max) return schema.max
  return next
}

/**
 * Reorder a list of effects by moving the entry at `fromIndex` to
 * `toIndex`. Returns a new array; the input is never mutated. Indices
 * outside the array bounds are clamped, so reorder-from-drop logic
 * doesn't have to worry about edge cases.
 *
 * @param effects - The original ordering.
 * @param fromIndex - Index of the effect being moved.
 * @param toIndex - Target index after the move.
 * @returns A new array with the effect moved into position.
 */
export function reorderEffects(effects: Effect[], fromIndex: number, toIndex: number): Effect[] {
  if (effects.length === 0) return effects
  const clampedFrom = Math.max(0, Math.min(effects.length - 1, fromIndex))
  const clampedTo = Math.max(0, Math.min(effects.length - 1, toIndex))
  if (clampedFrom === clampedTo) return effects
  const next = effects.slice()
  const [moved] = next.splice(clampedFrom, 1)
  next.splice(clampedTo, 0, moved!)
  return next
}
