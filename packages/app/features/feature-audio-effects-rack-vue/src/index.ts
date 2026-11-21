/**
 * Vue multi-effect rack for music-DAW and similar audio tools — the Vue
 * counterpart of `@molecule/app-feature-audio-effects-rack-react`, with the
 * same props and the same DOM for the same input.
 *
 * Renders a chain of effect panels — bypass toggle, per-param slider
 * grid, drag-to-reorder via pointer events, add-effect dropdown,
 * per-panel remove button. Pure UI: callers wire the emitted change
 * patches + reorder events back into a real audio engine (Tone.js,
 * the Web Audio API, native `AudioContext`, etc.).
 *
 * Exports `AudioEffectsRack`, the `Effect` / `EffectKind` /
 * `EffectChangePatch` shapes consumed by callers, the built-in
 * `EFFECT_KINDS` list and `EFFECT_PARAM_SCHEMAS` registry, and the
 * `resolveParamValue` / `reorderEffects` helpers used internally.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import {
 *   AudioEffectsRack,
 *   type Effect,
 * } from '@molecule/app-feature-audio-effects-rack-vue'
 *
 * const effects = ref<Effect[]>([
 *   { id: 'eq-1', kind: 'eq', enabled: true, params: { low: 2, mid: 0, high: -1 } },
 *   { id: 'rev-1', kind: 'reverb', enabled: true, params: { mix: 0.4, decay: 3 } },
 * ])
 *
 * const Rack = defineComponent({
 *   setup() {
 *     return () =>
 *       h(AudioEffectsRack, {
 *         effects: effects.value,
 *         onChange: (patch) => engine.applyEffectPatch(patch),
 *         onReorder: (next) => engine.applyEffectOrder(next),
 *         onAdd: (kind) => engine.addEffect(kind),
 *         onRemove: (id) => engine.removeEffect(id),
 *       })
 *   },
 * })
 *
 * createApp(Rack).mount('#app')
 * ```
 *
 * @remarks
 * All user-visible text routes through the companion locale bond
 * `@molecule/app-locales-feature-audio-effects-rack`. Styling
 * routes through `getClassMap()` from `@molecule/app-ui` — no
 * Tailwind utility class names appear in this package.
 *
 * @module
 */

export * from './AudioEffectsRack.js'
export * from './types.js'
