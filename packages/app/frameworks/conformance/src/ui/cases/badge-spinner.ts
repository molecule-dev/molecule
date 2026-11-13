/**
 * Badge and Spinner parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../spec.js'

const COLORS = ['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const
const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/** Badge: colors, sizes, square corners, passthrough. */
export const badgeCases: UIComponentCases = {
  component: 'Badge',
  cases: [
    { name: 'defaults', children: ['New'] },
    ...COLORS.map((color) => ({ name: `color ${color}`, props: { color }, children: ['3'] })),
    ...SIZES.map((size) => ({ name: `size ${size}`, props: { size }, children: ['3'] })),
    { name: 'square', props: { rounded: false }, children: ['Beta'] },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { marginLeft: '2px' }, testId: 'badge' },
      children: ['x'],
    },
    { name: 'element children', children: [{ tag: 'strong', children: ['12'] }, ' unread'] },
  ],
}

/** Spinner: sizes, custom color, label, passthrough of data-/aria- attributes. */
export const spinnerCases: UIComponentCases = {
  component: 'Spinner',
  cases: [
    { name: 'defaults' },
    ...SIZES.map((size) => ({ name: `size ${size}`, props: { size } })),
    { name: 'semantic color', props: { color: 'success' } },
    { name: 'custom css color', props: { color: '#ff0000' } },
    { name: 'label', props: { label: 'Fetching results' } },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { margin: '8px' }, testId: 'spinner' },
    },
    {
      name: 'data and aria passthrough',
      props: { 'data-mol-id': 'page-spinner', 'aria-live': 'polite' },
    },
  ],
}
