/**
 * Effects-rack feature for music-DAW and similar audio tools.
 *
 * Renders a chain of effect panels — bypass toggle, per-param slider
 * grid, drag-to-reorder via pointer events, add-effect dropdown,
 * per-panel remove button. Pure UI: callers wire the emitted change
 * patches + reorder events back into a real audio engine (Tone.js,
 * the Web Audio API, native `AudioContext`, etc.).
 *
 * Exports `<AudioEffectsRack>`, the `Effect` / `EffectKind` /
 * `EffectChangePatch` shapes consumed by callers, the built-in
 * `EFFECT_KINDS` list and `EFFECT_PARAM_SCHEMAS` registry, and the
 * `resolveParamValue` / `reorderEffects` helpers used internally.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import {
 *   AudioEffectsRack,
 *   type Effect,
 *   type EffectChangePatch,
 * } from '@molecule/app-feature-audio-effects-rack-react'
 *
 * export function TrackEffects() {
 *   const [effects, setEffects] = useState<Effect[]>([
 *     { id: 'eq-1', kind: 'eq', enabled: true, params: { low: 2, mid: 0, high: -1 } },
 *     { id: 'rev-1', kind: 'reverb', enabled: true, params: { mix: 0.4, decay: 3 } },
 *   ])
 *   const applyPatch = (patch: EffectChangePatch) =>
 *     setEffects((list) =>
 *       list.map((fx) => {
 *         if (fx.id !== patch.id) return fx
 *         if (patch.enabled !== undefined) return { ...fx, enabled: patch.enabled }
 *         if (patch.paramId && patch.paramValue !== undefined) {
 *           return { ...fx, params: { ...fx.params, [patch.paramId]: patch.paramValue } }
 *         }
 *         return fx
 *       }),
 *     )
 *   return (
 *     <AudioEffectsRack
 *       effects={effects}
 *       onChange={applyPatch}
 *       onReorder={setEffects}
 *       onAdd={(kind) => setEffects((list) => [...list, { id: `${kind}-${Date.now()}`, kind, enabled: true, params: {} }])}
 *       onRemove={(id) => setEffects((list) => list.filter((fx) => fx.id !== id))}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * All user-visible text routes through the companion locale bond
 * `@molecule/app-locales-feature-audio-effects-rack`. Styling
 * routes through `getClassMap()` from `@molecule/app-ui` — no
 * Tailwind utility class names appear in this package.
 *
 * - **Pure UI, fully controlled.** It makes NO sound and keeps no copy of the
 *   chain: every bypass / slider / add / remove / reorder only fires a callback.
 *   Apply each to your state (and to your audio engine) or the UI will not move.
 * - `onChange` receives a PATCH, not the effect: `{ id, enabled }` for bypass,
 *   `{ id, paramId, paramValue }` for a slider — merge it yourself.
 *   `onReorder` receives the full re-ordered array.
 * - Param ids/ranges come from `EFFECT_PARAM_SCHEMAS[kind]`; unknown param keys
 *   are ignored, missing ones render the schema default (so `params: {}` is a
 *   valid new effect).
 * - It calls `useTranslation()` from `@molecule/app-react`, so it MUST render
 *   inside `<I18nProvider>` / `<MoleculeProvider>`; `getClassMap()` throws
 *   unless `setClassMap(classMap)` ran at startup.
 *
 * @module
 */

export * from './AudioEffectsRack.js'
