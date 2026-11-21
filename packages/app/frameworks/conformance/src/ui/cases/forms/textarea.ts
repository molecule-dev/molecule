/**
 * Textarea parity cases.
 *
 * @module
 */

import type { CaseA11y, UIComponentCases } from '../../spec.js'

/** A bare Textarea with no label: its name is the caller's (a label, aria-label or FormField). */
const UNLABELLED: CaseA11y = {
  expect: ['label'],
  reason:
    "A bare Textarea with no label: its name is the caller's (a label, aria-label or FormField)",
}

/** Textarea: sizes, label/error/hint, rows, autoResize heights, control and events. */
export const textareaCases: UIComponentCases = {
  component: 'Textarea',
  ref: {},
  declaredProps: { props: 'element' },
  cases: [
    { name: 'defaults', a11y: UNLABELLED, props: { name: 'notes' } },
    ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      a11y: UNLABELLED,
      props: { size, name: 'notes' },
    })),
    { name: 'label', props: { label: 'Bio', name: 'bio' } },
    { name: 'label required', props: { label: 'Bio', required: true, name: 'bio' } },
    { name: 'placeholder', props: { placeholder: 'Tell us about yourself', name: 'bio' } },
    {
      name: 'hint',
      a11y: UNLABELLED,
      props: { hint: 'Up to three paragraphs.', name: 'bio' },
    },
    { name: 'error', a11y: UNLABELLED, props: { error: 'Too short.', name: 'bio' } },
    {
      name: 'error overrides hint',
      a11y: UNLABELLED,
      props: { error: 'Too short.', hint: 'Be verbose.', name: 'bio' },
    },
    { name: 'disabled', a11y: UNLABELLED, props: { disabled: true, name: 'bio' } },
    { name: 'rows', a11y: UNLABELLED, props: { rows: 6, name: 'bio' } },
    { name: 'minRows', a11y: UNLABELLED, props: { minRows: 2, name: 'bio' } },
    {
      name: 'minRows and maxRows',
      a11y: UNLABELLED,
      props: { minRows: 4, maxRows: 8, name: 'bio' },
    },
    {
      name: 'autoResize controlled',
      a11y: UNLABELLED,
      props: { autoResize: true, value: 'hello', name: 'bio' },
      callbacks: ['onChange'],
    },
    {
      name: 'autoResize clamps to maxRows',
      a11y: UNLABELLED,
      props: { autoResize: true, minRows: 6, maxRows: 2, name: 'bio' },
    },
    {
      name: 'autoResize uncontrolled grows on typing',
      a11y: UNLABELLED,
      props: { autoResize: true, defaultValue: 'seed', name: 'bio' },
      callbacks: ['onChange'],
      interactions: [{ type: 'input', selector: 'textarea', value: 'much longer content' }],
    },
    {
      name: 'autoResize recalculates on value change',
      a11y: UNLABELLED,
      props: { autoResize: true, value: 'one', name: 'bio' },
      callbacks: ['onChange'],
      interactions: [{ type: 'props', props: { value: 'a lot more text' } }],
    },
    {
      name: 'uncontrolled typing',
      a11y: UNLABELLED,
      props: { defaultValue: 'start', name: 'bio' },
      callbacks: ['onChange'],
      interactions: [{ type: 'input', selector: 'textarea', value: 'edited' }],
    },
    {
      name: 'controlled value restored after typing',
      a11y: UNLABELLED,
      props: { value: 'locked', name: 'bio' },
      callbacks: ['onChange'],
      interactions: [{ type: 'input', selector: 'textarea', value: 'attempt' }],
    },
    { name: 'explicit id', props: { id: 'bio-field', label: 'Bio' } },
    {
      name: 'className, style and testId',
      a11y: UNLABELLED,
      props: { className: 'parity-token', style: { marginTop: '4px' }, testId: 'bio', name: 'bio' },
    },
    {
      name: 'readOnly, maxLength and wrap passthrough',
      a11y: UNLABELLED,
      props: { readOnly: true, maxLength: 200, wrap: 'hard', defaultValue: 'fixed', name: 'bio' },
    },
    {
      name: 'passes through aria attributes',
      props: { 'aria-label': 'Free-form notes', name: 'bio' },
    },
    {
      name: 'change handler reads the typed value from target and the textarea as currentTarget',
      props: { label: 'Bio', name: 'bio' },
      callbacks: ['onChange'],
      callbackResults: { onChange: { read: ['target.value', 'currentTarget'] } },
      interactions: [{ type: 'input', selector: 'textarea', value: 'Writes compilers.' }],
    },
    {
      name: 'focus handler gets the textarea as currentTarget',
      props: { label: 'Bio', name: 'bio' },
      callbacks: ['onFocus'],
      callbackResults: { onFocus: { read: ['currentTarget'] } },
      interactions: [{ type: 'focus', selector: 'textarea' }],
    },
  ],
}
