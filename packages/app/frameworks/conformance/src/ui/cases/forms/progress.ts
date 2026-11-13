/**
 * Progress parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** Progress: values, clamping, max, sizes, colors, label/value display and indeterminate mode. */
export const progressCases: UIComponentCases = {
  component: 'Progress',
  cases: [
    { name: 'zero', props: { value: 0 } },
    { name: 'half', props: { value: 50 } },
    { name: 'full', props: { value: 100 } },
    { name: 'custom max', props: { value: 25, max: 50 } },
    { name: 'value above max clamps', props: { value: 150, max: 100 } },
    { name: 'negative value clamps', props: { value: -20 } },
    { name: 'fractional value rounds label', props: { value: 33.3, showValue: true } },
    ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      props: { value: 40, size },
    })),
    ...(['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const).map((color) => ({
      name: `color ${color}`,
      props: { value: 60, color },
    })),
    { name: 'showValue', props: { value: 72, showValue: true } },
    { name: 'label', props: { value: 45, label: 'Uploading' } },
    { name: 'label with value', props: { value: 45, label: 'Uploading', showValue: true } },
    { name: 'indeterminate', props: { value: 0, indeterminate: true } },
    {
      name: 'indeterminate hides value',
      props: { value: 30, indeterminate: true, showValue: true },
    },
    {
      name: 'value updates on re-render',
      props: { value: 20, label: 'Loading', showValue: true },
      interactions: [{ type: 'props', props: { value: 80 } }],
    },
    {
      name: 'className, style and testId',
      props: { value: 50, className: 'parity-token', style: { marginTop: '4px' }, testId: 'bar' },
    },
  ],
}
