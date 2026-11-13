/**
 * Textarea parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** Textarea: sizes, label/error/hint, rows, autoResize heights, control and events. */
export const textareaCases: UIComponentCases = {
  component: 'Textarea',
  cases: [
    { name: 'defaults', props: { name: 'notes' } },
    ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      props: { size, name: 'notes' },
    })),
    { name: 'label', props: { label: 'Bio', name: 'bio' } },
    { name: 'label required', props: { label: 'Bio', required: true, name: 'bio' } },
    { name: 'placeholder', props: { placeholder: 'Tell us about yourself', name: 'bio' } },
    { name: 'hint', props: { hint: 'Up to three paragraphs.', name: 'bio' } },
    { name: 'error', props: { error: 'Too short.', name: 'bio' } },
    {
      name: 'error overrides hint',
      props: { error: 'Too short.', hint: 'Be verbose.', name: 'bio' },
    },
    { name: 'disabled', props: { disabled: true, name: 'bio' } },
    { name: 'rows', props: { rows: 6, name: 'bio' } },
    { name: 'minRows', props: { minRows: 2, name: 'bio' } },
    { name: 'minRows and maxRows', props: { minRows: 4, maxRows: 8, name: 'bio' } },
    {
      name: 'autoResize controlled',
      props: { autoResize: true, value: 'hello', name: 'bio' },
      callbacks: ['onChange'],
    },
    {
      name: 'autoResize clamps to maxRows',
      props: { autoResize: true, minRows: 6, maxRows: 2, name: 'bio' },
    },
    {
      name: 'autoResize uncontrolled grows on typing',
      props: { autoResize: true, defaultValue: 'seed', name: 'bio' },
      callbacks: ['onChange'],
      interactions: [{ type: 'input', selector: 'textarea', value: 'much longer content' }],
    },
    {
      name: 'autoResize recalculates on value change',
      props: { autoResize: true, value: 'one', name: 'bio' },
      callbacks: ['onChange'],
      interactions: [{ type: 'props', props: { value: 'a lot more text' } }],
    },
    {
      name: 'uncontrolled typing',
      props: { defaultValue: 'start', name: 'bio' },
      callbacks: ['onChange'],
      interactions: [{ type: 'input', selector: 'textarea', value: 'edited' }],
    },
    {
      name: 'controlled value restored after typing',
      props: { value: 'locked', name: 'bio' },
      callbacks: ['onChange'],
      interactions: [{ type: 'input', selector: 'textarea', value: 'attempt' }],
    },
    { name: 'explicit id', props: { id: 'bio-field', label: 'Bio' } },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { marginTop: '4px' }, testId: 'bio', name: 'bio' },
    },
    {
      name: 'readOnly, maxLength and wrap passthrough',
      props: { readOnly: true, maxLength: 200, wrap: 'hard', defaultValue: 'fixed', name: 'bio' },
    },
    {
      name: 'passes through aria attributes',
      props: { 'aria-label': 'Free-form notes', name: 'bio' },
    },
  ],
}
