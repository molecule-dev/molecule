/**
 * Input parity cases.
 *
 * @module
 */

import type { CaseA11y, NodeSpec, UIComponentCases } from '../../spec.js'

/** A bare Input with no label: its name is the caller's (a label, aria-label or FormField). */
const UNLABELLED: CaseA11y = {
  expect: ['label'],
  reason: "A bare Input with no label: its name is the caller's (a label, aria-label or FormField)",
}

const adornment = (name: string): NodeSpec[] => [
  { tag: 'svg', attrs: { 'data-icon': name, viewBox: '0 0 24 24' } },
]

/** Input: types, sizes, alignment, label/error/hint, adornments, clearable, control and events. */
export const inputCases: UIComponentCases = {
  component: 'Input',
  ref: {},
  declaredProps: { props: 'element' },
  cases: [
    { name: 'defaults', a11y: UNLABELLED, props: { name: 'plain' } },
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
    ).map((type) => ({ name: `type ${type}`, a11y: UNLABELLED, props: { type, name: type } })),
    ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      a11y: UNLABELLED,
      props: { size, name: 'sized' },
    })),
    { name: 'align left', a11y: UNLABELLED, props: { align: 'left', name: 'left' } },
    { name: 'align center', a11y: UNLABELLED, props: { align: 'center', name: 'center' } },
    { name: 'label', props: { label: 'Email address', name: 'email' } },
    { name: 'label required', props: { label: 'Email address', required: true, name: 'email' } },
    { name: 'placeholder', props: { placeholder: 'you@example.com', name: 'email' } },
    {
      name: 'hint',
      a11y: UNLABELLED,
      props: { hint: 'We never share your email.', name: 'email' },
    },
    { name: 'error', a11y: UNLABELLED, props: { error: 'That email is taken.', name: 'email' } },
    {
      name: 'error overrides hint',
      a11y: UNLABELLED,
      props: { error: 'Required field.', hint: 'Optional help.', name: 'email' },
    },
    { name: 'disabled', a11y: UNLABELLED, props: { disabled: true, name: 'email' } },
    { name: 'explicit id', props: { id: 'custom-id', label: 'Email' } },
    {
      name: 'left element',
      a11y: UNLABELLED,
      slots: { leftElement: adornment('mail') },
      props: { name: 'email' },
    },
    {
      name: 'right element',
      a11y: UNLABELLED,
      slots: { rightElement: adornment('eye') },
      props: { name: 'password' },
    },
    {
      name: 'left and right elements',
      a11y: UNLABELLED,
      slots: { leftElement: adornment('mail'), rightElement: adornment('eye') },
      props: { name: 'email' },
    },
    {
      name: 'clearable with value shows clear button',
      a11y: UNLABELLED,
      props: { clearable: true, value: 'typed text', name: 'search' },
      callbacks: ['onChange', 'onClear'],
      interactions: [{ type: 'click', selector: 'button[aria-label="Clear"]' }],
    },
    {
      name: 'clearable with custom clear label',
      a11y: UNLABELLED,
      props: { clearable: true, clearLabel: 'Remove text', value: 'kept', name: 'search' },
      callbacks: ['onChange', 'onClear'],
      interactions: [{ type: 'click', selector: 'button[aria-label="Remove text"]' }],
    },
    {
      name: 'clearable without value hides clear button',
      a11y: UNLABELLED,
      props: { clearable: true, name: 'search' },
    },
    {
      name: 'right element wins over clearable',
      a11y: UNLABELLED,
      slots: { rightElement: adornment('search') },
      props: { clearable: true, value: 'text', name: 'search' },
      callbacks: ['onChange'],
    },
    {
      name: 'uncontrolled typing',
      a11y: UNLABELLED,
      props: { defaultValue: 'start', name: 'notes' },
      callbacks: ['onChange'],
      interactions: [{ type: 'input', selector: 'input', value: 'typed more' }],
    },
    {
      name: 'controlled value restored after typing',
      a11y: UNLABELLED,
      props: { value: 'locked', name: 'notes' },
      callbacks: ['onChange'],
      interactions: [{ type: 'input', selector: 'input', value: 'attempt' }],
    },
    {
      name: 'numeric value',
      a11y: UNLABELLED,
      props: { type: 'number', value: 42, name: 'count' },
      callbacks: ['onChange'],
    },
    {
      name: 'className, style and testId',
      a11y: UNLABELLED,
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
      a11y: UNLABELLED,
      props: { name: 'email' },
      callbacks: ['onFocus', 'onBlur'],
      interactions: [
        { type: 'focus', selector: 'input' },
        { type: 'blur', selector: 'input' },
      ],
    },
    {
      name: 'keydown is forwarded',
      a11y: UNLABELLED,
      props: { name: 'email' },
      callbacks: ['onKeyDown'],
      interactions: [{ type: 'keydown', selector: 'input', key: 'Enter' }],
    },
    {
      name: 'readOnly, maxLength and autoComplete passthrough',
      a11y: UNLABELLED,
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
    {
      name: 'change handler reads the typed value from target and the input as currentTarget',
      props: { label: 'Email address', name: 'email' },
      callbacks: ['onChange'],
      callbackResults: { onChange: { read: ['target.value', 'currentTarget'] } },
      interactions: [{ type: 'input', selector: 'input', value: 'ada@example.com' }],
    },
    {
      name: 'focus handler gets the input as currentTarget',
      props: { label: 'Email address', name: 'email' },
      callbacks: ['onFocus'],
      callbackResults: { onFocus: { read: ['currentTarget'] } },
      interactions: [{ type: 'focus', selector: 'input' }],
    },
    {
      name: 'keydown handler reads key and modifier keys',
      props: { label: 'Search', name: 'q' },
      callbacks: ['onKeyDown'],
      callbackResults: {
        onKeyDown: { read: ['key', 'metaKey', 'ctrlKey', 'shiftKey', 'altKey', 'currentTarget'] },
      },
      interactions: [
        { type: 'keydown', selector: 'input', key: 'k', metaKey: true },
        { type: 'keydown', selector: 'input', key: 'Enter', ctrlKey: true },
      ],
    },
  ],
}
