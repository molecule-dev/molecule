/**
 * `@molecule/app-price-range-slider-react` cases: the dual-handle numeric range
 * slider (two native `<input type="range">` controls with formatted endpoint
 * labels).
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-price-range-slider-react`. */
export const priceRangeSliderFeature: FeatureCases = {
  package: '@molecule/app-price-range-slider-react',
  families: [
    {
      component: 'PriceRangeSlider',
      cases: [
        {
          name: 'defaults',
          props: { min: 0, max: 1000, value: [50, 500] },
          callbacks: ['onChange'],
        },
        {
          name: 'custom step',
          props: { min: 0, max: 100, value: [20, 80], step: 10 },
          callbacks: ['onChange'],
        },
        {
          name: 'custom formatter',
          props: {
            min: 0,
            max: 100,
            value: [20, 80],
            formatValue: { $fn: 'points', format: '{0} pts' },
          },
          callbacks: ['onChange'],
        },
        {
          name: 'string label',
          slots: { label: ['Filter by price'] },
          props: { min: 0, max: 1000, value: [50, 500] },
          callbacks: ['onChange'],
        },
        {
          name: 'element label',
          slots: { label: [{ tag: 'strong', children: ['Budget'] }] },
          props: { min: 0, max: 1000, value: [50, 500] },
          callbacks: ['onChange'],
        },
        {
          name: 'className passthrough',
          props: { min: 0, max: 1000, value: [50, 500], className: 'parity-token' },
          callbacks: ['onChange'],
        },
        {
          name: 'low at min and high at max',
          props: { min: 0, max: 1000, value: [0, 1000] },
          callbacks: ['onChange'],
        },
        {
          name: 'equal low and high',
          props: { min: 0, max: 1000, value: [500, 500] },
          callbacks: ['onChange'],
        },
        {
          name: 'nonzero minimum and custom step',
          props: { min: 100, max: 2000, value: [250, 1750], step: 25 },
          callbacks: ['onChange'],
        },
        {
          name: 'minimum moves below high',
          props: { min: 0, max: 1000, value: [50, 500] },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: 'input[aria-label="Minimum"]', value: '320' }],
        },
        {
          name: 'minimum clamps against high',
          props: { min: 0, max: 1000, value: [50, 500] },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: 'input[aria-label="Minimum"]', value: '900' }],
        },
        {
          name: 'maximum moves above low',
          props: { min: 0, max: 1000, value: [50, 500] },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: 'input[aria-label="Maximum"]', value: '640' }],
        },
        {
          name: 'maximum clamps against low',
          props: { min: 0, max: 1000, value: [50, 500] },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: 'input[aria-label="Maximum"]', value: '20' }],
        },
        {
          name: 'both handles move',
          props: { min: 0, max: 1000, value: [50, 500] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input[aria-label="Minimum"]', value: '120' },
            { type: 'input', selector: 'input[aria-label="Maximum"]', value: '480' },
          ],
        },
        {
          name: 'value props change',
          props: { min: 0, max: 1000, value: [50, 500] },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { value: [80, 320] } }],
        },
        {
          name: 'step and formatter change',
          props: { min: 0, max: 1000, value: [50, 500] },
          callbacks: ['onChange'],
          interactions: [
            { type: 'props', props: { step: 25, formatValue: { $fn: 'krona', format: '{0} kr' } } },
          ],
        },
      ],
    },
  ],
}
