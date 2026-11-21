/**
 * Angular multi-effect rack for music-DAW and similar audio tools — the
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
 * import { Component } from '@angular/core'
 * import {
 *   AudioEffectsRack,
 *   type Effect,
 * } from '@molecule/app-feature-audio-effects-rack-angular'
 *
 * @Component({
 *   selector: 'app-rack',
 *   standalone: true,
 *   imports: [AudioEffectsRack],
 *   template: `
 *     <div mol-audio-effects-rack
 *          [effects]="effects"
 *          [onChange]="applyPatch"
 *          [onReorder]="applyOrder"
 *          [onAdd]="addEffect"
 *          [onRemove]="removeEffect">
 *     </div>
 *   `,
 * })
 * export class Rack {
 *   readonly effects: Effect[] = [
 *     { id: 'eq-1', kind: 'eq', enabled: true, params: { low: 2, mid: 0, high: -1 } },
 *     { id: 'rev-1', kind: 'reverb', enabled: true, params: { mix: 0.4, decay: 3 } },
 *   ]
 *   readonly applyPatch = (patch: unknown): void => engine.applyEffectPatch(patch)
 *   readonly applyOrder = (next: Effect[]): void => engine.applyEffectOrder(next)
 *   readonly addEffect = (kind: string): void => engine.addEffect(kind)
 *   readonly removeEffect = (id: string): void => engine.removeEffect(id)
 * }
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

export * from './audio-effects-rack.component.js'
export * from './types.js'
