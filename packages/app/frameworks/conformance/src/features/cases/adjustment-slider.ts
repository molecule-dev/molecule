/**
 * `@molecule/app-adjustment-slider-react` cases: the bipolar (zero-center)
 * numeric slider, its reset behaviour (button + double-click), its arrow-key
 * nudging, the default and custom value formatters, the optional center mark,
 * and the three pure helpers (`clampStep`, `defaultResetValue`, `keyboardNudge`).
 *
 * `defaultFormatter` returns a formatter function, so it is framework-shaped
 * (its output is compared through the rendered display) instead of a value.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A custom formatter, the render function `format(value)` React calls. */
const customFormat = { $fn: 'format', format: '+{0} EV' }

/** A second custom formatter, used to prove a `format` prop change updates the display. */
const unitFormat = { $fn: 'format', format: '{0} dB' }

/** `@molecule/app-adjustment-slider-react`. */
export const adjustmentSliderFeature: FeatureCases = {
  package: '@molecule/app-adjustment-slider-react',
  families: [
    {
      component: 'AdjustmentSlider',
      cases: [
        // Defaults: min -100, max 100, step 1, bipolar, no unit, center mark at 50%.
        // The family's first case also derives the locale-switch case, so it
        // carries the translated `aria-label`s.
        {
          name: 'defaults with a value and no unit',
          props: { label: 'Brightness', value: 25 },
          callbacks: ['onChange'],
        },
        {
          name: 'defaults at the reset target',
          props: { label: 'Brightness', value: 0 },
          callbacks: ['onChange'],
        },

        // Default formatter: value + unit.
        {
          name: 'unit suffix',
          props: { label: 'Brightness', value: 25, unit: '%' },
          callbacks: ['onChange'],
        },
        {
          name: 'unit with a leading space',
          props: { label: 'Gain', value: -3, unit: ' dB' },
          callbacks: ['onChange'],
        },
        {
          name: 'negative value without a unit',
          props: { label: 'Contrast', value: -40 },
          callbacks: ['onChange'],
        },

        // Center-mark branches: shown only when bipolar AND the range crosses zero.
        {
          name: 'unipolar slider hides the center mark',
          props: { label: 'Volume', value: 50, min: 0, max: 100, bipolar: false },
          callbacks: ['onChange'],
        },
        {
          name: 'bipolar slider above zero has no center mark',
          props: { label: 'Volume', value: 30, min: 20, max: 100 },
          callbacks: ['onChange'],
        },
        {
          name: 'asymmetric range places the center mark',
          props: { label: 'Exposure', value: 10, min: -20, max: 60 },
          callbacks: ['onChange'],
        },
        {
          name: 'fractional step range',
          props: { label: 'Saturation', value: 0.3, min: -1, max: 1, step: 0.1 },
          callbacks: ['onChange'],
        },

        // Custom formatter wins over the unit.
        {
          name: 'custom formatter',
          props: { label: 'Exposure', value: 1.5, format: customFormat },
          callbacks: ['onChange'],
        },
        {
          name: 'custom formatter ignores the unit',
          props: { label: 'Exposure', value: 1.5, unit: '%', format: customFormat },
          callbacks: ['onChange'],
        },

        // className / dataMolId passthrough.
        {
          name: 'className and dataMolId passthrough',
          props: {
            label: 'Hue',
            value: 0,
            className: 'parity-token',
            dataMolId: 'adjustment-slider-hue',
          },
          callbacks: ['onChange'],
        },

        // Reset: double-click.
        {
          name: 'double-click restores the bipolar default',
          props: { label: 'Hue', value: 42 },
          callbacks: ['onChange'],
          interactions: [{ type: 'dblclick', selector: '[data-mol-id="adjustment-slider-input"]' }],
        },
        {
          name: 'double-click restores min in unipolar mode',
          props: { label: 'Volume', value: 75, min: 20, max: 100, bipolar: false },
          callbacks: ['onChange'],
          interactions: [{ type: 'dblclick', selector: '[data-mol-id="adjustment-slider-input"]' }],
        },
        {
          name: 'double-click uses a custom onReset',
          props: { label: 'Tint', value: 20 },
          callbacks: ['onChange', 'onReset'],
          interactions: [{ type: 'dblclick', selector: '[data-mol-id="adjustment-slider-input"]' }],
        },

        // Reset: the value display button.
        {
          name: 'reset button restores the bipolar default',
          props: { label: 'Contrast', value: 15 },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="adjustment-slider-reset"]' }],
        },
        {
          name: 'reset button uses a custom onReset',
          props: { label: 'Contrast', value: 15 },
          callbacks: ['onChange', 'onReset'],
          interactions: [{ type: 'click', selector: '[data-mol-id="adjustment-slider-reset"]' }],
        },

        // Keyboard: Shift + arrows nudge by 10x step; plain arrows are native.
        {
          name: 'shift+arrow up nudges by ten steps',
          props: { label: 'Gain', value: 0 },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'keydown',
              selector: '[data-mol-id="adjustment-slider-input"]',
              key: 'ArrowUp',
              shiftKey: true,
            },
          ],
        },
        {
          name: 'shift+arrow right nudges by ten steps',
          props: { label: 'Gain', value: 0 },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'keydown',
              selector: '[data-mol-id="adjustment-slider-input"]',
              key: 'ArrowRight',
              shiftKey: true,
            },
          ],
        },
        {
          name: 'shift+arrow down nudges down by ten steps',
          props: { label: 'Gain', value: 0, step: 2 },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'keydown',
              selector: '[data-mol-id="adjustment-slider-input"]',
              key: 'ArrowDown',
              shiftKey: true,
            },
          ],
        },
        {
          name: 'shift+arrow left nudges down by ten steps',
          props: { label: 'Gain', value: 0 },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'keydown',
              selector: '[data-mol-id="adjustment-slider-input"]',
              key: 'ArrowLeft',
              shiftKey: true,
            },
          ],
        },
        {
          name: 'a shift nudge clamps against max',
          props: { label: 'Gain', value: 95 },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'keydown',
              selector: '[data-mol-id="adjustment-slider-input"]',
              key: 'ArrowUp',
              shiftKey: true,
            },
          ],
        },
        {
          name: 'plain arrows are left to the native slider',
          props: { label: 'Gain', value: 0 },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'keydown',
              selector: '[data-mol-id="adjustment-slider-input"]',
              key: 'ArrowUp',
            },
          ],
        },
        {
          name: 'a shift keypress that is not an arrow does nothing',
          props: { label: 'Gain', value: 0 },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'keydown',
              selector: '[data-mol-id="adjustment-slider-input"]',
              key: 'a',
              shiftKey: true,
            },
          ],
        },

        // Typing: clamped + step-snapped, and a no-op when nothing changes.
        {
          name: 'typing a value snaps it to the step',
          props: { label: 'Saturation', value: 0, min: -1, max: 1, step: 0.1 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="adjustment-slider-input"]', value: '0.46' },
          ],
        },
        {
          name: 'typing the current value emits nothing',
          props: { label: 'Hue', value: 50, min: 0, max: 100, bipolar: false },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="adjustment-slider-input"]', value: '50' },
          ],
        },
        {
          name: 'typing below the range clamps to min',
          props: { label: 'Brightness', value: 0 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="adjustment-slider-input"]', value: '-500' },
          ],
        },
        {
          name: 'typing above the range clamps to max',
          props: { label: 'Brightness', value: 0 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="adjustment-slider-input"]', value: '500' },
          ],
        },
        {
          name: 'typing then changing the value prop',
          props: { label: 'Saturation', value: 0, min: -1, max: 1, step: 0.1 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="adjustment-slider-input"]', value: '0.4' },
            { type: 'props', props: { value: 0.9 } },
          ],
        },

        // Prop changes.
        {
          name: 'value prop changes move the slider and the display',
          props: { label: 'Brightness', value: 0 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { value: 50 } },
            { type: 'props', props: { value: -25 } },
          ],
        },
        {
          name: 'range prop changes move the center mark',
          props: { label: 'Exposure', value: 0 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { min: 0, max: 100 } },
            { type: 'props', props: { min: -20, max: 60 } },
          ],
        },
        {
          name: 'bipolar prop change hides and restores the center mark',
          props: { label: 'Volume', value: 0 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { bipolar: false } },
            { type: 'props', props: { bipolar: true } },
          ],
        },
        {
          name: 'format and unit prop changes update the display',
          props: { label: 'Exposure', value: 1.5, unit: '%' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { format: customFormat } },
            { type: 'props', props: { format: unitFormat, unit: undefined } },
            { type: 'props', props: { format: undefined } },
          ],
        },
        {
          name: 'className and dataMolId prop changes',
          props: { label: 'Hue', value: 0 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { className: 'parity-token' } },
            { type: 'props', props: { dataMolId: 'adjustment-slider-y' } },
          ],
        },
        {
          name: 'step prop change then a shift nudge',
          props: { label: 'Gain', value: 0 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { step: 5 } },
            {
              type: 'keydown',
              selector: '[data-mol-id="adjustment-slider-input"]',
              key: 'ArrowUp',
              shiftKey: true,
            },
          ],
        },
        {
          name: 'min and max prop changes reach the input',
          props: { label: 'Brightness', value: 0 },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { min: 0, max: 10 } }],
        },
      ],
    },
  ],
  values: [
    {
      export: 'clampStep',
      calls: [
        [-200, -100, 100, 1],
        [200, -100, 100, 1],
        [0.4, 0, 1, 0.1],
        [0.46, 0, 1, 0.1],
        [0.06, -1, 1, 0.1],
        [-0.06, -1, 1, 0.1],
        [0.3, 0, 1, 0.1],
        [7, 0, 10, 0],
        [Number.NaN, -10, 10, 1],
      ],
    },
    {
      export: 'defaultResetValue',
      calls: [
        [-100, true],
        [0, false],
        [50, false],
        [20, true],
      ],
    },
    {
      export: 'keyboardNudge',
      calls: [
        [1, false],
        [0.1, false],
        [1, true],
        [0.1, true],
        [2, true],
      ],
    },
  ],
  frameworkShaped: {
    defaultFormatter:
      'returns a formatter function; its output is compared through the rendered value display',
  },
}
