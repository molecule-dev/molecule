/**
 * `@molecule/app-color-swatch-picker-react` cases: the colored-circle
 * single-select swatch picker.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const swatches = [
  { value: 'red', color: '#ef4444', label: 'Red' },
  { value: 'green', color: '#22c55e', label: 'Green' },
  { value: 'blue', color: '#3b82f6' },
]

const preview = [
  {
    tag: 'div',
    attrs: { 'data-preview': '' },
    children: ['#22c55e'],
  },
]

/** `@molecule/app-color-swatch-picker-react`. */
export const colorSwatchPickerFeature: FeatureCases = {
  package: '@molecule/app-color-swatch-picker-react',
  families: [
    {
      component: 'ColorSwatchPicker',
      cases: [
        {
          name: 'three swatches, second selected',
          props: { swatches, value: 'green' },
          callbacks: ['onChange'],
        },
        {
          name: 'custom size, aria label and class',
          props: {
            swatches,
            value: 'red',
            size: 40,
            ariaLabel: 'Tag color',
            className: 'parity-token',
          },
          callbacks: ['onChange'],
        },
        {
          name: 'gap xs then md',
          props: { swatches, value: 'blue', gap: 'xs' },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { gap: 'md' } }],
        },
        {
          name: 'click selects a swatch',
          props: { swatches, value: 'red' },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="color-swatch-blue"]' }],
        },
        {
          name: 'controlled value change',
          props: { swatches, value: 'red' },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { value: 'blue' } }],
        },
        {
          name: 'size change',
          props: { swatches, value: 'red', size: 20 },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { size: 48 } }],
        },
        {
          name: 'preview rendered below',
          props: { swatches, value: 'green' },
          slots: { preview },
          callbacks: ['onChange'],
        },
        {
          name: 'no swatches',
          props: { swatches: [], value: '' },
          callbacks: ['onChange'],
        },
      ],
    },
  ],
}
