/**
 * `@molecule/app-layer-panel-react` cases: the Photoshop-style layer stack —
 * one row per layer, top-down, with the eye / lock toggles, the blend-mode +
 * opacity metadata badge, the optional thumbnail, the active-row highlight and
 * the inline rename (double-click, typing, Enter, Escape, blur, and the locked
 * row that refuses to open it), plus the pointer-drag start / end and the two
 * plain utilities `moveLayer` and `formatOpacityPercent`.
 *
 * The panel is fully controlled: every interaction reports intent through a
 * callback, so a case's DOM changes only for the panel's own transient state
 * (a drag in flight, an open rename field). Every case lists all five
 * callbacks, so no interaction reaches an `undefined` prop. No case reads an
 * app service, so they mount under the UI providers only.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Every callback `<LayerPanel>` accepts, React spelling. */
const callbacks = ['onReorder', 'onVisibilityToggle', 'onLockToggle', 'onSelect', 'onRename']

/**
 * One layer row; the required flags default to a visible, unlocked layer.
 *
 * @param id - The layer id.
 * @param name - The layer name.
 * @param rest - Optional metadata (`opacity`, `blendMode`, `thumbnail`) or flag overrides.
 * @returns A plain layer object.
 */
const layer = (
  id: string,
  name: string,
  rest: Record<string, unknown> = {},
): Record<string, unknown> => ({ id, name, visible: true, locked: false, ...rest })

/**
 * The three-row stack most cases start from: `top` (blend mode + full opacity),
 * `mid` (half opacity) and `bot` (hidden, locked, no metadata).
 *
 * @returns A fresh top-down layer array.
 */
const stack = (): Record<string, unknown>[] => [
  layer('top', 'Top', { opacity: 1, blendMode: 'normal' }),
  layer('mid', 'Mid', { opacity: 0.5 }),
  layer('bot', 'Bot', { visible: false, locked: true }),
]

/** Every blend mode the type allows, rendered once each. */
const BLEND_MODES = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-dodge',
  'color-burn',
  'hard-light',
  'soft-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
]

/** A minimal layer for the `moveLayer` value checks. */
const named = (id: string): Record<string, unknown> => ({
  id,
  name: id,
  visible: true,
  locked: false,
})

/** A row's selector, by layer id. */
const row = (id: string): string => `[data-mol-id="layer-panel-row-${id}"]`

/** A row's name-slot `<div>` — the element that starts an inline rename. */
const nameSlot = (id: string): string => `${row(id)} > div`

/** A row's layer-name button. */
const nameButton = (id: string): string => `[data-mol-id="layer-panel-name-${id}"]`

/** A row's eye (visibility) button. */
const eye = (id: string): string => `[data-mol-id="layer-panel-visibility-${id}"]`

/** A row's lock button. */
const lock = (id: string): string => `[data-mol-id="layer-panel-lock-${id}"]`

/** A row's inline rename field. */
const renameField = (id: string): string => `[data-mol-id="layer-panel-rename-${id}"]`

/** `@molecule/app-layer-panel-react`. */
export const layerPanelFeature: FeatureCases = {
  package: '@molecule/app-layer-panel-react',
  families: [
    {
      component: 'LayerPanel',
      cases: [
        // First, so the derived locale-switch case renders the translated
        // listbox label and the eye / lock button labels.
        { name: 'three layers, top-down', props: { layers: stack() }, callbacks },
        { name: 'an empty stack', props: { layers: [] }, callbacks },
        {
          name: 'one plain layer with no metadata',
          props: { layers: [layer('plain', 'Plain')] },
          callbacks,
        },
        {
          name: 'blend mode only',
          props: { layers: [layer('a', 'A', { blendMode: 'multiply' })] },
          callbacks,
        },
        {
          name: 'opacity only',
          props: { layers: [layer('a', 'A', { opacity: 0.25 })] },
          callbacks,
        },
        {
          name: 'blend mode and opacity',
          props: { layers: [layer('a', 'A', { blendMode: 'screen', opacity: 0.75 })] },
          callbacks,
        },
        {
          name: 'opacity clamped at both ends',
          props: {
            layers: [
              layer('zero', 'Zero', { opacity: 0 }),
              layer('full', 'Full', { opacity: 1 }),
              layer('below', 'Below', { opacity: -1 }),
              layer('above', 'Above', { opacity: 2 }),
            ],
          },
          callbacks,
        },
        {
          name: 'every blend mode value',
          props: {
            layers: BLEND_MODES.map((mode, index) => layer(`m${index}`, mode, { blendMode: mode })),
          },
          callbacks,
        },
        {
          name: 'a thumbnail row',
          props: { layers: [layer('thumb', 'Thumb', { thumbnail: 'https://example.com/t.png' })] },
          callbacks,
        },
        {
          name: 'className passthrough',
          props: { layers: stack(), className: 'parity-token' },
          callbacks,
        },
        {
          name: 'the active layer is highlighted',
          props: { layers: stack(), activeId: 'mid' },
          callbacks,
        },
        {
          name: 'an activeId matching no layer highlights nothing',
          props: { layers: stack(), activeId: 'nope' },
          callbacks,
        },

        // Selection: the name is a native button; the row itself never selects.
        {
          name: 'clicking a layer name reports the selection',
          props: { layers: stack() },
          callbacks,
          interactions: [{ type: 'click', selector: nameButton('mid') }],
        },
        {
          name: 'the highlight follows a changed activeId',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'click', selector: nameButton('mid') },
            { type: 'props', props: { activeId: 'mid' } },
            { type: 'props', props: { activeId: 'top' } },
          ],
        },
        {
          name: 'clearing the activeId drops the highlight',
          props: { layers: stack(), activeId: 'mid' },
          callbacks,
          interactions: [{ type: 'props', props: { activeId: undefined } }],
        },
        {
          name: 'clicking the row outside its controls does not select',
          props: { layers: stack(), activeId: 'top' },
          callbacks,
          interactions: [
            { type: 'click', selector: row('mid') },
            { type: 'click', selector: '[data-mol-id="layer-panel-meta-mid"]' },
          ],
        },

        // The eye and lock toggles.
        {
          name: 'the eye toggle reports a visible layer',
          props: { layers: stack() },
          callbacks,
          interactions: [{ type: 'click', selector: eye('top') }],
        },
        {
          name: 'the eye toggle reports a hidden layer',
          props: { layers: stack() },
          callbacks,
          interactions: [{ type: 'click', selector: eye('bot') }],
        },
        {
          name: 'the lock toggle reports a locked layer',
          props: { layers: stack() },
          callbacks,
          interactions: [{ type: 'click', selector: lock('bot') }],
        },
        {
          name: 'the lock toggle reports an unlocked layer',
          props: { layers: stack() },
          callbacks,
          interactions: [{ type: 'click', selector: lock('mid') }],
        },
        {
          name: 'a visibility toggle changes what the next layer list renders',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'click', selector: eye('top') },
            {
              type: 'props',
              props: {
                layers: stack().map((l) => (l.id === 'top' ? { ...l, visible: false } : l)),
              },
            },
          ],
        },

        // Drag-to-reorder: a pointer press marks the row, release or cancel ends it.
        {
          name: 'a pointer press starts a drag and the release ends it',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'pointer', selector: row('mid'), event: 'pointerdown', clientY: 40 },
            { type: 'pointer', selector: row('mid'), event: 'pointerup', clientY: 40 },
          ],
        },
        {
          name: 'pointercancel ends a drag',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'pointer', selector: row('top'), event: 'pointerdown', clientY: 8 },
            { type: 'pointer', selector: row('top'), event: 'pointercancel', clientY: 8 },
          ],
        },
        {
          name: 'a locked layer does not start a drag',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'pointer', selector: row('bot'), event: 'pointerdown', clientY: 80 },
            { type: 'pointer', selector: row('bot'), event: 'pointerup', clientY: 80 },
          ],
        },
        {
          name: 'a press inside the rename field does not drag the row',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'dblclick', selector: nameSlot('top') },
            { type: 'pointer', selector: renameField('top'), event: 'pointerdown', clientY: 8 },
            { type: 'pointer', selector: renameField('top'), event: 'pointerup', clientY: 8 },
          ],
        },

        // Inline rename.
        {
          name: 'double-click opens the rename field',
          props: { layers: stack() },
          callbacks,
          interactions: [{ type: 'dblclick', selector: nameSlot('top') }],
        },
        {
          name: 'typing into the field keeps it open with the typed text',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'dblclick', selector: nameSlot('top') },
            { type: 'input', selector: renameField('top'), value: 'Draft' },
          ],
        },
        {
          name: 'Enter commits the trimmed name',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'dblclick', selector: nameSlot('top') },
            { type: 'input', selector: renameField('top'), value: '  Background  ' },
            { type: 'keydown', selector: renameField('top'), key: 'Enter' },
          ],
        },
        {
          name: 'Escape cancels the rename',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'dblclick', selector: nameSlot('top') },
            { type: 'input', selector: renameField('top'), value: 'Discarded' },
            { type: 'keydown', selector: renameField('top'), key: 'Escape' },
          ],
        },
        {
          name: 'an empty trimmed value does not commit',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'dblclick', selector: nameSlot('top') },
            { type: 'input', selector: renameField('top'), value: '   ' },
            { type: 'keydown', selector: renameField('top'), key: 'Enter' },
          ],
        },
        {
          name: 'an unchanged name does not commit',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'dblclick', selector: nameSlot('top') },
            { type: 'input', selector: renameField('top'), value: 'Top' },
            { type: 'keydown', selector: renameField('top'), key: 'Enter' },
          ],
        },
        {
          name: 'another key leaves the rename field open',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'dblclick', selector: nameSlot('top') },
            { type: 'input', selector: renameField('top'), value: 'Partial' },
            { type: 'keydown', selector: renameField('top'), key: 'a' },
          ],
        },
        {
          name: 'blurring the field commits the rename',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'dblclick', selector: nameSlot('top') },
            { type: 'input', selector: renameField('top'), value: 'Renamed' },
            { type: 'blur', selector: renameField('top') },
          ],
        },
        {
          name: 'a middle layer renames',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'dblclick', selector: nameSlot('mid') },
            { type: 'input', selector: renameField('mid'), value: 'Middle' },
            { type: 'keydown', selector: renameField('mid'), key: 'Enter' },
          ],
        },
        {
          name: 'a locked layer does not open the rename field',
          props: { layers: stack() },
          callbacks,
          interactions: [{ type: 'dblclick', selector: nameSlot('bot') }],
        },
        {
          name: 'the committed rename shows in the next layer list',
          props: { layers: stack() },
          callbacks,
          interactions: [
            { type: 'dblclick', selector: nameSlot('top') },
            { type: 'input', selector: renameField('top'), value: 'Background' },
            { type: 'keydown', selector: renameField('top'), key: 'Enter' },
            {
              type: 'props',
              props: {
                layers: stack().map((l) => (l.id === 'top' ? { ...l, name: 'Background' } : l)),
              },
            },
          ],
        },

        // Prop changes that re-render an already mounted panel.
        {
          name: 'a new layer list re-renders the rows',
          props: { layers: stack() },
          callbacks,
          interactions: [
            {
              type: 'props',
              props: {
                layers: [
                  layer('top', 'Foreground', { opacity: 0.9, blendMode: 'screen' }),
                  layer('mid', 'Mid'),
                ],
              },
            },
          ],
        },
        {
          name: 'reordering the layers reorders the rows',
          props: { layers: stack() },
          callbacks,
          interactions: [{ type: 'props', props: { layers: [...stack()].reverse() } }],
        },
        {
          name: 'unlocking a locked layer enables its controls',
          props: { layers: stack() },
          callbacks,
          interactions: [
            {
              type: 'props',
              props: { layers: stack().map((l) => (l.id === 'bot' ? { ...l, locked: false } : l)) },
            },
          ],
        },
        {
          name: 'metadata appears when opacity is added',
          props: { layers: [layer('a', 'A')] },
          callbacks,
          interactions: [{ type: 'props', props: { layers: [layer('a', 'A', { opacity: 0.4 })] } }],
        },
        {
          name: 'a thumbnail appears and disappears',
          props: { layers: [layer('a', 'A', { thumbnail: 'https://example.com/a.png' })] },
          callbacks,
          interactions: [
            { type: 'props', props: { layers: [layer('a', 'A')] } },
            {
              type: 'props',
              props: { layers: [layer('a', 'A', { thumbnail: 'https://example.com/b.png' })] },
            },
          ],
        },
        {
          name: 'className changes on the root',
          props: { layers: stack(), className: 'first-token' },
          callbacks,
          interactions: [{ type: 'props', props: { className: 'second-token' } }],
        },
      ],
    },
  ],
  values: [
    {
      export: 'moveLayer',
      calls: [
        [[named('a'), named('b'), named('c')], 0, 2],
        [[named('a'), named('b'), named('c')], 2, 0],
        [[named('a'), named('b'), named('c')], 1, 1],
        [[named('a'), named('b'), named('c')], -5, 99],
        [[named('a'), named('b')], 2, 0],
        [[], 0, 1],
        [[named('a')], 0, 0],
      ],
    },
    {
      export: 'formatOpacityPercent',
      calls: [[1], [0], [0.5], [0.333], [0.666], [0.005], [-1], [2], [undefined], [Number.NaN]],
    },
  ],
}
