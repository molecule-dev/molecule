/**
 * Label parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** Label: required marker, htmlFor association, children and class passthrough. */
export const labelCases: UIComponentCases = {
  component: 'Label',
  cases: [
    { name: 'defaults', children: ['Email address'] },
    { name: 'required', props: { required: true }, children: ['Email address'] },
    { name: 'htmlFor', props: { htmlFor: 'email-field' }, children: ['Email address'] },
    {
      name: 'htmlFor and required',
      props: { htmlFor: 'email-field', required: true },
      children: ['Email address'],
    },
    {
      name: 'element children',
      props: { htmlFor: 'email-field' },
      children: [{ tag: 'strong', children: ['Email'] }, ' (required)'],
    },
    {
      name: 'className and htmlFor',
      props: { className: 'parity-token', htmlFor: 'email-field' },
      children: ['Email'],
    },
  ],
}
