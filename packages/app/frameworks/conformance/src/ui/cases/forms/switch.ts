/**
 * Switch parity cases.
 *
 * @module
 */

import type { CaseA11y, UIComponentCases } from '../../spec.js'

/** A bare Switch with no label: its name is the caller's (a label or aria-label). */
const UNLABELLED: CaseA11y = {
  expect: ['button-name'],
  reason: "A bare Switch with no label: its name is the caller's (a label or aria-label)",
}

/** Switch: sizes, colors, checked states, labels, disabled and the native change event it forwards. */
export const switchCases: UIComponentCases = {
  component: 'Switch',
  ref: {},
  declaredProps: { props: 'element' },
  cases: [
    { name: 'defaults', a11y: UNLABELLED },
    ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      a11y: UNLABELLED,
      props: { size },
    })),
    ...(['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const).map((color) => ({
      name: `color ${color}`,
      a11y: UNLABELLED,
      props: { color, checked: true },
    })),
    { name: 'checked', a11y: UNLABELLED, props: { checked: true }, callbacks: ['onChange'] },
    {
      name: 'unchecked explicit',
      a11y: UNLABELLED,
      props: { checked: false },
      callbacks: ['onChange'],
    },
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
      a11y: UNLABELLED,
      props: { size: 'lg', color: 'success', checked: true },
      callbacks: ['onChange'],
    },
    {
      name: 'className, style and testId',
      a11y: UNLABELLED,
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
    {
      name: 'preventDefault in onClick vetoes the toggle',
      props: { label: 'Notifications' },
      callbacks: ['onClick', 'onChange'],
      callbackResults: { onClick: { effects: ['preventDefault'], read: ['defaultPrevented'] } },
      interactions: [{ type: 'click', selector: 'button[role="switch"]' }],
    },
    {
      name: 'change handler reads checked from target',
      props: { label: 'Notifications' },
      callbacks: ['onChange'],
      callbackResults: { onChange: { read: ['target.checked'] } },
      interactions: [{ type: 'click', selector: 'button[role="switch"]' }],
    },
  ],
}
