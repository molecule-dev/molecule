/**
 * Checkbox parity cases.
 *
 * @module
 */

import type { CaseA11y, UIComponentCases } from '../../spec.js'

/** A bare Checkbox with no label: its name is the caller's (a label, aria-label or FormField). */
const UNLABELLED: CaseA11y = {
  expect: ['label'],
  reason:
    "A bare Checkbox with no label: its name is the caller's (a label, aria-label or FormField)",
}

/** Checkbox: label, checked/indeterminate states, error, disabled and change events. */
export const checkboxCases: UIComponentCases = {
  component: 'Checkbox',
  cases: [
    { name: 'defaults', a11y: UNLABELLED, props: { name: 'agree' } },
    { name: 'label', props: { label: 'Accept terms', name: 'agree' } },
    {
      name: 'element label',
      slots: { label: [{ tag: 'strong', children: ['Accept'] }, ' the terms'] },
      props: { name: 'agree' },
    },
    {
      name: 'checked',
      props: { label: 'Subscribe', checked: true, name: 'news' },
      callbacks: ['onChange'],
    },
    {
      name: 'unchecked explicit',
      props: { label: 'Subscribe', checked: false, name: 'news' },
      callbacks: ['onChange'],
    },
    {
      name: 'indeterminate unchecked',
      props: { label: 'All items', indeterminate: true, name: 'bulk' },
    },
    {
      name: 'indeterminate checked',
      props: { label: 'All items', indeterminate: true, checked: true, name: 'bulk' },
      callbacks: ['onChange'],
    },
    { name: 'disabled', props: { label: 'Locked choice', disabled: true, name: 'agree' } },
    {
      name: 'disabled checked',
      props: { label: 'Locked choice', disabled: true, checked: true, name: 'agree' },
      callbacks: ['onChange'],
    },
    {
      name: 'error',
      props: { label: 'Accept terms', error: 'You must accept to continue.', name: 'agree' },
    },
    { name: 'error without label', a11y: UNLABELLED, props: { error: 'Required.', name: 'agree' } },
    { name: 'explicit id', props: { id: 'agree-box', label: 'Accept terms' } },
    {
      name: 'defaultChecked passthrough',
      props: { label: 'Remember me', defaultChecked: true, name: 'remember' },
    },
    {
      name: 'className, style and testId',
      a11y: UNLABELLED,
      props: {
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'agree',
        name: 'agree',
      },
    },
    {
      name: 'passes through aria and data attributes',
      props: { 'aria-label': 'Accept the terms', 'data-mol-id': 'agree-checkbox', name: 'agree' },
    },
    {
      name: 'check reports change',
      props: { label: 'Subscribe', name: 'news' },
      callbacks: ['onChange'],
      interactions: [{ type: 'check', selector: 'input[type="checkbox"]', checked: true }],
    },
    {
      name: 'uncheck reports change',
      props: { label: 'Subscribe', checked: true, name: 'news' },
      callbacks: ['onChange'],
      interactions: [{ type: 'check', selector: 'input[type="checkbox"]', checked: false }],
    },
    // A controlled `checked` the parent changes after mount: React writes the property on
    // update and leaves the attribute it mounted with.
    {
      name: 'controlled checked turned on, then off',
      props: { label: 'Subscribe', checked: false, name: 'news' },
      callbacks: ['onChange'],
      interactions: [
        { type: 'props', props: { checked: true } },
        { type: 'props', props: { checked: false } },
      ],
    },
    {
      name: 'controlled checked turned off, then on',
      props: { label: 'Subscribe', checked: true, name: 'news' },
      callbacks: ['onChange'],
      interactions: [
        { type: 'props', props: { checked: false } },
        { type: 'props', props: { checked: true } },
      ],
    },
    {
      name: 'controlled indeterminate cleared',
      props: { label: 'All items', indeterminate: true, checked: false, name: 'bulk' },
      callbacks: ['onChange'],
      interactions: [{ type: 'props', props: { indeterminate: false, checked: true } }],
    },
  ],
}
