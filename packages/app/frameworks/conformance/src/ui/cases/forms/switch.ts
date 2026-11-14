/**
 * Switch parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** Switch: sizes, colors, checked states, labels, disabled and the native change event it forwards. */
export const switchCases: UIComponentCases = {
  component: 'Switch',
  cases: [
    { name: 'defaults' },
    ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      props: { size },
    })),
    ...(['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const).map((color) => ({
      name: `color ${color}`,
      props: { color, checked: true },
    })),
    { name: 'checked', props: { checked: true }, callbacks: ['onChange'] },
    { name: 'unchecked explicit', props: { checked: false }, callbacks: ['onChange'] },
    { name: 'label', props: { label: 'Dark mode' } },
    {
      name: 'element label',
      slots: { label: [{ tag: 'strong', children: ['Beta'] }, ' features'] },
    },
    {
      name: 'checked with label',
      props: { label: 'Notifications', checked: true },
      callbacks: ['onChange'],
    },
    { name: 'disabled', props: { label: 'Managed by admin', disabled: true } },
    {
      name: 'disabled checked',
      props: { label: 'Managed by admin', disabled: true, checked: true },
      callbacks: ['onChange'],
    },
    {
      name: 'large success checked',
      props: { size: 'lg', color: 'success', checked: true },
      callbacks: ['onChange'],
    },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { marginTop: '4px' }, testId: 'toggle' },
    },
    {
      name: 'passes through aria and data attributes',
      props: { 'data-mol-id': 'dark-mode-toggle', 'aria-label': 'Toggle dark mode' },
    },
    {
      name: 'click reports change',
      props: { label: 'Sync' },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: 'button[role="switch"]' }],
    },
    {
      name: 'click on checked reports change',
      props: { label: 'Sync', checked: true },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: 'button[role="switch"]' }],
    },
    // A controlled `checked` the parent changes after mount (a theme or a setting loaded
    // late): React writes the property on update and leaves the attribute it mounted with.
    {
      name: 'controlled checked turned on, then off',
      props: { label: 'Sync', checked: false },
      callbacks: ['onChange'],
      interactions: [
        { type: 'props', props: { checked: true } },
        { type: 'props', props: { checked: false } },
      ],
    },
    {
      name: 'controlled checked turned off, then on',
      props: { label: 'Sync', checked: true },
      callbacks: ['onChange'],
      interactions: [
        { type: 'props', props: { checked: false } },
        { type: 'props', props: { checked: true } },
      ],
    },
    {
      name: 'disabled click does not report change',
      props: { label: 'Sync', disabled: true },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: 'button[role="switch"]' }],
    },
    {
      name: 'keydown is forwarded',
      props: { label: 'Sync' },
      callbacks: ['onKeyDown'],
      interactions: [{ type: 'keydown', selector: 'button[role="switch"]', key: ' ' }],
    },
  ],
}
