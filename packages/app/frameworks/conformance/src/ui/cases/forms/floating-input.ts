/**
 * FloatingInput parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** FloatingInput: placeholder-as-label association, controlled and uncontrolled typing, types and passthrough. */
export const floatingInputCases: UIComponentCases = {
  component: 'FloatingInput',
  cases: [
    { name: 'defaults', props: { placeholder: 'Email address' } },
    { name: 'no placeholder', props: { name: 'anon' } },
    {
      name: 'defaultValue',
      props: { placeholder: 'Email address', defaultValue: 'ada@example.com' },
    },
    {
      name: 'controlled value restored after typing',
      props: { placeholder: 'Email address', value: 'locked@x.io' },
      callbacks: ['onChange'],
      interactions: [{ type: 'input', selector: 'input', value: 'attempt@x.io' }],
    },
    {
      name: 'uncontrolled typing updates value',
      props: { placeholder: 'Email address', defaultValue: 'seed' },
      callbacks: ['onChange'],
      interactions: [{ type: 'input', selector: 'input', value: 'typed more' }],
    },
    { name: 'disabled', props: { placeholder: 'Email address', disabled: true } },
    { name: 'type email', props: { placeholder: 'Email address', type: 'email', name: 'email' } },
    {
      name: 'type password',
      props: { placeholder: 'Password', type: 'password', name: 'password' },
    },
    {
      name: 'explicit id associates the floating label',
      props: { id: 'floating-email', placeholder: 'Email address' },
    },
    {
      name: 'className and data-testid',
      props: { placeholder: 'Email address', className: 'parity-token', 'data-testid': 'floating' },
    },
    {
      name: 'readOnly and maxLength',
      props: {
        placeholder: 'Email address',
        readOnly: true,
        maxLength: 30,
        defaultValue: 'fixed@x.io',
      },
    },
    {
      name: 'focus and blur callbacks',
      props: { placeholder: 'Email address' },
      callbacks: ['onFocus', 'onBlur'],
      interactions: [
        { type: 'focus', selector: 'input' },
        { type: 'blur', selector: 'input' },
      ],
    },
  ],
}
