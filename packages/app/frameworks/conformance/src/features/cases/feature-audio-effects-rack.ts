/**
 * `@molecule/app-feature-audio-effects-rack-react` cases: the multi-effect
 * rack — the add-effect dropdown with one option per effect kind, the empty
 * state, one panel per effect (kind label, drag handle, bypass toggle,
 * per-param slider grid, remove button), the emitted change / add / remove /
 * reorder callbacks, and pointer drag-to-reorder.
 *
 * Panels carry `data-effect-id` / `data-effect-kind`, so a case targets one
 * panel's controls through the panel's `data-effect-id`. Drags go through the
 * pointer vocabulary: `pointerdown` on a handle picks the panel up, a
 * bubbling `pointerover` (which React derives `onPointerEnter` from) moves
 * the drop target, and `pointerup` on the rack root drops.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** One effect on the rack, as a case prop. */
const effect = (
  id: string,
  kind: string,
  enabled: boolean,
  params: Record<string, number> = {},
): { id: string; kind: string; enabled: boolean; params: Record<string, number> } => ({
  id,
  kind,
  enabled,
  params,
})

/** A three-effect chain across three kinds, one bypassed. */
const THREE = [
  effect('eq-1', 'eq', true, { low: 2, mid: 0, high: -1 }),
  effect('comp-1', 'compressor', false, { threshold: -20, ratio: 4 }),
  effect('rev-1', 'reverb', true, { mix: 0.4 }),
]

/** Every built-in kind, in `EFFECT_KINDS` order. */
const EVERY_KIND = [
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
]

/** The rack root. */
const root = '[data-mol-id="audio-effects-rack"]'
/** The panel of one effect, by id. */
const panelOf = (id: string): string =>
  `[data-mol-id="audio-effects-rack-panel"][data-effect-id="${id}"]`
/** The drag handle of one effect, by id. */
const handleOf = (id: string): string =>
  `${panelOf(id)} [data-mol-id="audio-effects-rack-drag-handle"]`
/** The bypass toggle of one effect, by id. */
const bypassOf = (id: string): string => `${panelOf(id)} [data-mol-id="audio-effects-rack-bypass"]`
/** The remove button of one effect, by id. */
const removeOf = (id: string): string => `${panelOf(id)} [data-mol-id="audio-effects-rack-remove"]`
/** The n-th panel (1-based) in the chain. */
const panelAt = (n: number): string =>
  `[data-mol-id="audio-effects-rack-chain"] > [data-mol-id="audio-effects-rack-panel"]:nth-child(${n})`
/** A param slider by param id inside the first matching panel. */
const paramInput = (paramId: string): string =>
  `[data-mol-id="audio-effects-rack-param-input"][data-param-id="${paramId}"]`
/** The add-effect dropdown. */
const addSelect = '[data-mol-id="audio-effects-rack-add-select"]'

/** `@molecule/app-feature-audio-effects-rack-react`. */
export const featureAudioEffectsRackFeature: FeatureCases = {
  package: '@molecule/app-feature-audio-effects-rack-react',
  families: [
    {
      component: 'AudioEffectsRack',
      cases: [
        {
          name: 'empty rack shows the empty state',
          props: { effects: [] },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
        },
        {
          name: 'one effect renders its panel',
          props: { effects: [THREE[0]] },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
        },
        {
          name: 'a bypassed effect renders pressed and dimmed',
          props: { effects: [THREE[1]] },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
        },
        {
          name: 'every effect kind renders',
          props: { effects: EVERY_KIND.map((kind, i) => effect(`f-${i}`, kind, true)) },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
        },
        {
          name: 'out-of-range params render clamped to the schema interval',
          props: {
            effects: [
              effect('eq-hi', 'eq', true, { low: 100, mid: -100, high: 3.25 }),
              effect('limiter-lo', 'limiter', true, { threshold: -999, release: 2 }),
            ],
          },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
        },
        {
          name: 'missing params render the schema defaults',
          props: { effects: [effect('dly-1', 'delay', true, { time: 0.5 })] },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
        },
        {
          name: 'an unknown effect kind renders without params or a title',
          props: { effects: [effect('x-1', 'bitcrusher', true, { amount: 4 })] },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
        },
        {
          name: 'a className reaches the rack root',
          props: { effects: THREE, className: 'rack-frame' },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
        },
        {
          name: 'clicking bypass emits an enabled patch',
          props: { effects: THREE },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [
            { type: 'click', selector: bypassOf('eq-1') },
            { type: 'click', selector: bypassOf('comp-1') },
          ],
        },
        {
          name: 'moving a param slider emits a param patch',
          props: { effects: [THREE[0]] },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [
            { type: 'input', selector: paramInput('low'), value: '6' },
            // A value past the schema max is clamped before the patch.
            { type: 'input', selector: paramInput('low'), value: '999' },
            // A value below the schema min is clamped up before the patch.
            { type: 'input', selector: paramInput('low'), value: '-999' },
            // A range input sanitizes a non-numeric value to its midpoint (0
            // here), so the patch carries that instead of nothing.
            { type: 'input', selector: paramInput('low'), value: 'not-a-number' },
          ],
        },
        {
          name: 'choosing an effect from the add select emits onAdd',
          props: { effects: [] },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [{ type: 'input', selector: addSelect, value: 'phaser' }],
        },
        {
          name: 'choosing the placeholder emits nothing',
          props: { effects: [] },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [{ type: 'input', selector: addSelect, value: '' }],
        },
        {
          name: 'an unknown select value emits nothing',
          props: { effects: [] },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [{ type: 'input', selector: addSelect, value: 'bitcrusher' }],
        },
        {
          name: 'clicking remove emits onRemove',
          props: { effects: THREE },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [{ type: 'click', selector: removeOf('comp-1') }],
        },
        {
          name: 'dragging a panel over another and dropping reorders',
          props: { effects: THREE },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [
            { type: 'pointer', selector: handleOf('eq-1'), event: 'pointerdown' },
            // React derives onPointerEnter from a bubbling pointerover.
            { type: 'event', selector: panelAt(3), event: 'pointerover', bubbles: true },
            { type: 'pointer', selector: root, event: 'pointerup' },
          ],
        },
        {
          name: 'dropping a panel back on itself does not reorder',
          props: { effects: THREE },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [
            { type: 'pointer', selector: handleOf('eq-1'), event: 'pointerdown' },
            { type: 'event', selector: panelAt(1), event: 'pointerover', bubbles: true },
            { type: 'pointer', selector: root, event: 'pointerup' },
          ],
        },
        {
          name: 'a pointerup without a drag does not reorder',
          props: { effects: THREE },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [{ type: 'pointer', selector: root, event: 'pointerup' }],
        },
        {
          name: 'a pointerover without a drag changes nothing',
          props: { effects: THREE },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [
            { type: 'event', selector: panelAt(3), event: 'pointerover', bubbles: true },
            { type: 'pointer', selector: root, event: 'pointerup' },
          ],
        },
        {
          name: 'pointercancel drops a drag and reorders',
          props: { effects: THREE },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [
            { type: 'pointer', selector: handleOf('eq-1'), event: 'pointerdown' },
            { type: 'event', selector: panelAt(3), event: 'pointerover', bubbles: true },
            { type: 'pointer', selector: root, event: 'pointercancel' },
          ],
        },
        {
          name: 'every callback is optional',
          props: { effects: THREE },
          interactions: [
            { type: 'click', selector: bypassOf('eq-1') },
            { type: 'input', selector: paramInput('low'), value: '6' },
            { type: 'click', selector: removeOf('comp-1') },
            { type: 'input', selector: addSelect, value: 'eq' },
            { type: 'pointer', selector: handleOf('eq-1'), event: 'pointerdown' },
            { type: 'event', selector: panelAt(3), event: 'pointerover', bubbles: true },
            { type: 'pointer', selector: root, event: 'pointerup' },
          ],
        },
        {
          name: 'a new effects prop re-renders the chain in its order',
          props: { effects: THREE },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [
            {
              type: 'props',
              props: {
                effects: [THREE[2], THREE[0], THREE[1]],
              },
            },
          ],
        },
        {
          name: 'a new effects prop can empty the chain',
          props: { effects: THREE },
          callbacks: ['onChange', 'onAdd', 'onRemove', 'onReorder'],
          interactions: [{ type: 'props', props: { effects: [] } }],
        },
      ],
    },
  ],
  values: [
    { export: 'EFFECT_KINDS' },
    { export: 'EFFECT_PARAM_SCHEMAS' },
    {
      export: 'resolveParamValue',
      calls: [
        [
          { id: 'e', kind: 'eq', enabled: true, params: { low: 5 } },
          { id: 'low', min: -24, max: 24, step: 0.5, default: 0 },
        ],
        [
          { id: 'e', kind: 'eq', enabled: true, params: {} },
          { id: 'low', min: -24, max: 24, step: 0.5, default: 0 },
        ],
        [
          { id: 'e', kind: 'eq', enabled: true, params: { low: Number.NaN } },
          { id: 'low', min: -24, max: 24, step: 0.5, default: 0 },
        ],
        [
          { id: 'e', kind: 'compressor', enabled: true, params: { threshold: -1000 } },
          { id: 'threshold', min: -60, max: 0, step: 0.5, default: -24 },
        ],
        [
          { id: 'e', kind: 'compressor', enabled: true, params: { ratio: 9999 } },
          { id: 'ratio', min: 1, max: 20, step: 0.1, default: 4 },
        ],
        [
          { id: 'e', kind: 'eq', enabled: true, params: { low: Number.POSITIVE_INFINITY } },
          { id: 'low', min: -24, max: 24, step: 0.5, default: 0 },
        ],
      ],
    },
    {
      export: 'reorderEffects',
      calls: [
        [
          [
            { id: 'a', kind: 'eq', enabled: true, params: {} },
            { id: 'b', kind: 'reverb', enabled: false, params: {} },
            { id: 'c', kind: 'delay', enabled: true, params: {} },
          ],
          0,
          2,
        ],
        [
          [
            { id: 'a', kind: 'eq', enabled: true, params: {} },
            { id: 'b', kind: 'reverb', enabled: false, params: {} },
            { id: 'c', kind: 'delay', enabled: true, params: {} },
          ],
          -5,
          99,
        ],
        [
          [
            { id: 'a', kind: 'eq', enabled: true, params: {} },
            { id: 'b', kind: 'reverb', enabled: false, params: {} },
          ],
          1,
          1,
        ],
        [[], 0, 0],
        [
          [
            { id: 'a', kind: 'eq', enabled: true, params: {} },
            { id: 'b', kind: 'reverb', enabled: false, params: {} },
            { id: 'c', kind: 'delay', enabled: true, params: {} },
          ],
          2,
          0,
        ],
      ],
    },
  ],
}
