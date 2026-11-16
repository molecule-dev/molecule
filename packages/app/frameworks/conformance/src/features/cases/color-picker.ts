/**
 * `@molecule/app-color-picker-react` cases: the controlled HSV + RGB + HEX
 * picker, every slider and channel, the hex draft / commit branches, and the
 * six pure color-space helpers.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The hex text input's selector. */
const hex = '[data-mol-id="color-picker-hex"]'
/** The hue range input's selector. */
const hue = '[data-mol-id="color-picker-hue"]'
/** The saturation range input's selector. */
const saturation = '[data-mol-id="color-picker-saturation"]'
/** The value / brightness range input's selector. */
const valueSlider = '[data-mol-id="color-picker-value"]'
/** The red channel's input selector. */
const red = '[data-mol-id="color-picker-r"]'
/** The green channel's input selector. */
const green = '[data-mol-id="color-picker-g"]'
/** The blue channel's input selector. */
const blue = '[data-mol-id="color-picker-b"]'

/** `@molecule/app-color-picker-react`. */
export const colorPickerFeature: FeatureCases = {
  package: '@molecule/app-color-picker-react',
  families: [
    {
      component: 'ColorPicker',
      cases: [
        // The default render: swatch, hex input, HSV + RGB sliders, the
        // default `data-mol-id`, and the four translated labels. The family's
        // first case also derives the locale-switch case, so its translated
        // text must follow a locale change.
        {
          name: 'default color and ids',
          props: { value: '#3366ff' },
          callbacks: ['onChange'],
        },
        {
          name: 'black',
          props: { value: '#000000' },
          callbacks: ['onChange'],
        },
        {
          name: 'white',
          props: { value: '#ffffff' },
          callbacks: ['onChange'],
        },
        {
          name: 'three-digit hex value',
          props: { value: '#abc' },
          callbacks: ['onChange'],
        },
        {
          name: 'unparseable value falls back to black',
          props: { value: 'not-a-color' },
          callbacks: ['onChange'],
        },
        {
          name: 'absent value falls back to black',
          props: {},
          callbacks: ['onChange'],
        },
        {
          name: 'className and dataMolId passthrough',
          props: {
            value: '#ff8800',
            className: 'parity-token',
            dataMolId: 'stroke-color',
          },
          callbacks: ['onChange'],
        },
        {
          name: 'empty dataMolId is still rendered',
          props: { value: '#ff8800', dataMolId: '' },
          callbacks: ['onChange'],
        },

        // Hue slider.
        {
          name: 'hue slider to 120',
          props: { value: '#3366ff' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: hue, value: '120' }],
        },
        {
          name: 'hue slider to 0',
          props: { value: '#00ff00' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: hue, value: '0' }],
        },
        {
          name: 'hue slider to 360',
          props: { value: '#00ff00' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: hue, value: '360' }],
        },

        // Saturation slider.
        {
          name: 'saturation slider to 50',
          props: { value: '#3366ff' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: saturation, value: '50' }],
        },
        {
          name: 'saturation slider to 0',
          props: { value: '#3366ff' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: saturation, value: '0' }],
        },
        {
          name: 'saturation slider to 100',
          props: { value: '#808080' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: saturation, value: '100' }],
        },

        // Value / brightness slider.
        {
          name: 'value slider to 0',
          props: { value: '#ffffff' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: valueSlider, value: '0' }],
        },
        {
          name: 'value slider to 50',
          props: { value: '#ffffff' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: valueSlider, value: '50' }],
        },

        // RGB channel inputs.
        {
          name: 'red channel to 255',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: red, value: '255' }],
        },
        {
          name: 'green channel to 128',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: green, value: '128' }],
        },
        {
          name: 'blue channel to 0',
          props: { value: '#ffffff' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: blue, value: '0' }],
        },
        {
          name: 'red channel above 255',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: red, value: '300' }],
        },

        // Hex draft: typing, then the three commit paths.
        {
          name: 'typed hex commits on Enter',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: hex, value: '#abcdef' },
            { type: 'keydown', selector: hex, key: 'Enter' },
          ],
        },
        {
          name: 'typed hex commits on blur',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: hex, value: '#112233' },
            { type: 'blur', selector: hex },
          ],
        },
        {
          name: 'typed three-digit hex normalises on Enter',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: hex, value: '#abc' },
            { type: 'keydown', selector: hex, key: 'Enter' },
          ],
        },
        {
          name: 'typed hex without a hash commits on Enter',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: hex, value: 'ff8800' },
            { type: 'keydown', selector: hex, key: 'Enter' },
          ],
        },
        {
          name: 'invalid typed hex commits nothing on Enter',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: hex, value: 'notacolor' },
            { type: 'keydown', selector: hex, key: 'Enter' },
          ],
        },
        {
          name: 'invalid typed hex commits nothing on blur',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: hex, value: 'zzzzzz' },
            { type: 'blur', selector: hex },
          ],
        },
        {
          name: 'an empty hex commits nothing on blur',
          props: { value: '#3366ff' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: hex, value: '' },
            { type: 'blur', selector: hex },
          ],
        },
        {
          name: 'a non-Enter key leaves the draft alone',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: hex, value: '#abcdef' },
            { type: 'keydown', selector: hex, key: 'Escape' },
          ],
        },
        {
          name: 'typing keeps the partial value until commit',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: hex, value: '#12' }],
        },

        // Prop changes.
        {
          name: 'value prop change',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { value: '#ff00ff' } }],
        },
        {
          name: 'value prop change to a three-digit hex',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { value: '#abc' } }],
        },
        {
          name: 'a typed draft survives a value prop change',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: hex, value: '#123456' },
            { type: 'props', props: { value: '#00ff00' } },
          ],
        },
        {
          name: 'a slider event after a value prop change',
          props: { value: '#000000' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { value: '#ff0000' } },
            { type: 'input', selector: hue, value: '120' },
          ],
        },
        {
          name: 'className and dataMolId prop changes',
          props: { value: '#3366ff' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { className: 'parity-token' } },
            { type: 'props', props: { dataMolId: 'stroke-color' } },
          ],
        },
      ],
    },
  ],
  values: [
    {
      export: 'clamp',
      calls: [
        [5, 0, 10],
        [-1, 0, 10],
        [11, 0, 10],
        [0.5, 0, 1],
        [Number.POSITIVE_INFINITY, 0, 10],
      ],
    },
    {
      export: 'hexToRgb',
      calls: [
        ['#3366ff'],
        ['3366ff'],
        ['#abc'],
        ['#ABCDEF'],
        ['  #fff  '],
        ['not-a-color'],
        [''],
        ['#1234'],
      ],
    },
    {
      export: 'rgbToHex',
      calls: [
        [{ r: 51, g: 102, b: 255 }],
        [{ r: 300, g: -5, b: 0 }],
        [{ r: 0.4, g: 0.6, b: 1.4 }],
        [{ r: 0, g: 0, b: 0 }],
      ],
    },
    {
      export: 'rgbToHsv',
      calls: [
        [{ r: 255, g: 0, b: 0 }],
        [{ r: 0, g: 255, b: 0 }],
        [{ r: 0, g: 0, b: 255 }],
        [{ r: 0, g: 0, b: 0 }],
        [{ r: 255, g: 255, b: 255 }],
        [{ r: 200, g: 50, b: 150 }],
      ],
    },
    {
      export: 'hsvToRgb',
      calls: [
        [{ h: 0, s: 1, v: 1 }],
        [{ h: 120, s: 1, v: 1 }],
        [{ h: 240, s: 1, v: 1 }],
        [{ h: 360, s: 1, v: 1 }],
        [{ h: -30, s: 1, v: 1 }],
        [{ h: 200, s: 0.5, v: 0.5 }],
        [{ h: 60, s: 0, v: 0 }],
      ],
    },
    {
      export: 'isValidHex',
      calls: [['#3366ff'], ['3366ff'], ['#abc'], ['zzzzzz'], ['#1234'], ['']],
    },
  ],
}
