/**
 * FormField parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** FormField: label association and the aria-describedby/aria-invalid injection onto a single child. */
export const formFieldCases: UIComponentCases = {
  component: 'FormField',
  cases: [
    {
      name: 'label and input child',
      props: { label: 'Email address', name: 'email' },
      children: [{ component: 'Input', props: { placeholder: 'you@example.com' } }],
    },
    {
      name: 'required label',
      props: { label: 'Email address', name: 'email', required: true },
      children: [{ component: 'Input', props: { placeholder: 'you@example.com' } }],
    },
    {
      name: 'error injects describedby and aria-invalid',
      props: { label: 'Email address', name: 'email', error: 'Invalid address.' },
      children: [{ component: 'Input', props: { defaultValue: 'nope' } }],
    },
    {
      name: 'hint injects describedby',
      props: { label: 'Email address', name: 'email', hint: 'We never share it.' },
      children: [{ component: 'Input' }],
    },
    {
      name: 'error overrides hint',
      props: { label: 'Email address', name: 'email', error: 'Invalid.', hint: 'Helpful text.' },
      children: [{ component: 'Input' }],
    },
    {
      name: 'name drives ids without label',
      props: { name: 'email' },
      children: [{ component: 'Input' }],
    },
    {
      name: 'child keeps its own id',
      props: { label: 'Email', name: 'email', error: 'Invalid.' },
      children: [{ component: 'Input', props: { id: 'custom-id' } }],
    },
    {
      name: 'child aria-describedby is appended',
      props: { label: 'Email', name: 'email', hint: 'Extra help.' },
      children: [{ component: 'Input', props: { 'aria-describedby': 'existing-note' } }],
    },
    {
      name: 'plain input element child',
      props: { label: 'Bare field', name: 'bare' },
      children: [{ tag: 'input', attrs: { type: 'text', name: 'bare' } }],
    },
    {
      name: 'multiple children are not cloned',
      props: { label: 'Pair', name: 'pair' },
      children: [
        { component: 'Input', props: { name: 'first' } },
        { component: 'Input', props: { name: 'second' } },
      ],
    },
    {
      name: 'select child',
      props: { label: 'Plan', name: 'plan', hint: 'Switch anytime.' },
      children: [
        {
          component: 'Select',
          props: {
            options: [
              { value: 'free', label: 'Free' },
              { value: 'pro', label: 'Pro' },
            ],
          },
        },
      ],
    },
    {
      name: 'textarea child',
      props: { label: 'Bio', name: 'bio', error: 'Too short.' },
      children: [{ component: 'Textarea', props: { defaultValue: 'hi' } }],
    },
    {
      name: 'checkbox child',
      props: { label: 'Agree', name: 'agree' },
      children: [{ component: 'Checkbox', props: { defaultChecked: true } }],
    },
    {
      name: 'no label, no name',
      children: [{ component: 'Input', props: { placeholder: 'Anonymous' } }],
    },
    {
      name: 'className, style and testId',
      props: {
        label: 'Email',
        name: 'email',
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'field',
      },
      children: [{ component: 'Input' }],
    },
  ],
}
