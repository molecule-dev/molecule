/**
 * Input parity cases.
 *
 * @module
 */

import type { NodeSpec, UIComponentCases } from '../../spec.js'

const adornment = (name: string): NodeSpec[] => [
  { tag: 'svg', attrs: { 'data-icon': name, viewBox: '0 0 24 24' } },
]

/** Input: types, sizes, alignment, label/error/hint, adornments, clearable, control and events. */
export const inputCases: UIComponentCases = {
  component: 'Input',
  cases: [
    { name: 'defaults', props: { name: 'plain' } },
    ...(
      [
        'email',
        'password',
        'number',
        'tel',
        'url',
        'search',
        'date',
        'time',
        'datetime-local',
      ] as const
    ).map((type) => ({ name: `type ${type}`, props: { type, name: type } })),
    ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      props: { size, name: 'sized' },
    })),
    { name: 'align left', props: { align: 'left', name: 'left' } },
    { name: 'align center', props: { align: 'center', name: 'center' } },
    { name: 'label', props: { label: 'Email address', name: 'email' } },
    { name: 'label required', props: { label: 'Email address', required: true, name: 'email' } },
    { name: 'placeholder', props: { placeholder: 'you@example.com', name: 'email' } },
    { name: 'hint', props: { hint: 'We never share your email.', name: 'email' } },
    { name: 'error', props: { error: 'That email is taken.', name: 'email' } },
    {
      name: 'error overrides hint',
      props: { error: 'Required field.', hint: 'Optional help.', name: 'email' },
    },
    { name: 'disabled', props: { disabled: true, name: 'email' } },
    { name: 'explicit id', props: { id: 'custom-id', label: 'Email' } },
    {
      name: 'left element',
      slots: { leftElement: adornment('mail') },
      props: { name: 'email' },
    },
    {
      name: 'right element',
      slots: { rightElement: adornment('eye') },
      props: { name: 'password' },
    },
    {
      name: 'left and right elements',
      slots: { leftElement: adornment('mail'), rightElement: adornment('eye') },
      props: { name: 'email' },
    },
    {
      name: 'clearable with value shows clear button',
      props: { clearable: true, value: 'typed text', name: 'search' },
      callbacks: ['onChange', 'onClear'],
      interactions: [{ type: 'click', selector: 'button[aria-label="Clear"]' }],
    },
    {
      name: 'clearable with custom clear label',
      props: { clearable: true, clearLabel: 'Remove text', value: 'kept', name: 'search' },
      callbacks: ['onChange', 'onClear'],
      interactions: [{ type: 'click', selector: 'button[aria-label="Remove text"]' }],
    },
    {
      name: 'clearable without value hides clear button',
      props: { clearable: true, name: 'search' },
    },
    {
      name: 'right element wins over clearable',
      slots: { rightElement: adornment('search') },
      props: { clearable: true, value: 'text', name: 'search' },
      callbacks: ['onChange'],
    },
    {
      name: 'uncontrolled typing',
      props: { defaultValue: 'start', name: 'notes' },
      callbacks: ['onChange'],
      interactions: [{ type: 'input', selector: 'input', value: 'typed more' }],
    },
    {
      name: 'controlled value restored after typing',
      props: { value: 'locked', name: 'notes' },
      callbacks: ['onChange'],
      interactions: [{ type: 'input', selector: 'input', value: 'attempt' }],
    },
    {
      name: 'numeric value',
      props: { type: 'number', value: 42, name: 'count' },
      callbacks: ['onChange'],
    },
    {
      name: 'className, style and testId',
      props: {
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'field',
        name: 'email',
      },
    },
    {
      name: 'passes through aria and data attributes',
      props: { 'aria-label': 'Search everything', 'data-mol-id': 'search-field', name: 'q' },
    },
    {
      name: 'focus and blur callbacks',
      props: { name: 'email' },
      callbacks: ['onFocus', 'onBlur'],
      interactions: [
        { type: 'focus', selector: 'input' },
        { type: 'blur', selector: 'input' },
      ],
    },
    {
      name: 'keydown is forwarded',
      props: { name: 'email' },
      callbacks: ['onKeyDown'],
      interactions: [{ type: 'keydown', selector: 'input', key: 'Enter' }],
    },
    {
      name: 'readOnly, maxLength and autoComplete passthrough',
      props: {
        readOnly: true,
        maxLength: 40,
        autoComplete: 'email',
        defaultValue: 'fixed@x.io',
        name: 'email',
      },
    },
    {
      name: 'error appears on re-render',
      props: { label: 'Email', name: 'email' },
      interactions: [{ type: 'props', props: { error: 'Invalid address.' } }],
    },
  ],
}
