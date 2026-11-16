/**
 * Form parity cases.
 *
 * @module
 */

import type { CaseA11y, UIComponentCases } from '../../spec.js'

/** The case's fields are bare inputs and selects without labels. */
const BARE_INPUTS: CaseA11y = {
  expect: ['label'],
  reason: "The case's fields are bare inputs and selects without labels",
}

/** The case's fields are bare inputs and selects without labels. */
const BARE_FIELDS: CaseA11y = {
  expect: ['label', 'select-name'],
  reason: "The case's fields are bare inputs and selects without labels",
}

const plans = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
]

/** Form: fieldset wrapping, submit handling with FormData collection, submitting state and attributes. */
export const formCases: UIComponentCases = {
  component: 'Form',
  cases: [
    {
      name: 'defaults',
      children: [{ component: 'Input', props: { name: 'email', placeholder: 'Email' } }],
    },
    {
      name: 'submit collects form data',
      a11y: BARE_FIELDS,
      callbacks: ['onFormSubmit', 'onSubmit'],
      children: [
        { component: 'Input', props: { name: 'email', defaultValue: 'ada@example.com' } },
        { component: 'Input', props: { name: 'count', type: 'number', defaultValue: '2' } },
        { component: 'Select', props: { name: 'plan', options: plans, value: 'pro' } },
        { component: 'Checkbox', props: { name: 'tos', defaultChecked: true } },
        {
          component: 'RadioGroup',
          props: {
            name: 'size',
            options: [
              { value: 's', label: 'Small' },
              { value: 'm', label: 'Medium' },
            ],
            value: 'm',
          },
        },
        { component: 'Textarea', props: { name: 'notes', defaultValue: 'hello' } },
      ],
      interactions: [{ type: 'submit', selector: 'form' }],
    },
    {
      name: 'onSubmit receives the event',
      a11y: BARE_INPUTS,
      callbacks: ['onSubmit'],
      children: [{ component: 'Input', props: { name: 'email', defaultValue: 'a@b.io' } }],
      interactions: [{ type: 'submit', selector: 'form' }],
    },
    {
      name: 'both submit handlers fire',
      a11y: BARE_INPUTS,
      callbacks: ['onFormSubmit', 'onSubmit'],
      children: [{ component: 'Input', props: { name: 'email', defaultValue: 'a@b.io' } }],
      interactions: [{ type: 'submit', selector: 'form' }],
    },
    {
      name: 'submitting disables fields',
      a11y: BARE_FIELDS,
      props: { submitting: true },
      children: [
        { component: 'Input', props: { name: 'email', defaultValue: 'a@b.io' } },
        { component: 'Select', props: { name: 'plan', options: plans } },
      ],
    },
    {
      name: 'submit while submitting omits disabled fields',
      a11y: BARE_INPUTS,
      props: { submitting: true },
      callbacks: ['onFormSubmit'],
      children: [{ component: 'Input', props: { name: 'email', defaultValue: 'a@b.io' } }],
      interactions: [{ type: 'submit', selector: 'form' }],
    },
    {
      name: 'action, method and noValidate',
      a11y: BARE_INPUTS,
      props: { action: '/submit', method: 'post', noValidate: true },
      children: [{ component: 'Input', props: { name: 'email' } }],
    },
    {
      name: 'plain input children',
      a11y: BARE_INPUTS,
      children: [
        { tag: 'input', attrs: { type: 'text', name: 'bare' } },
        { tag: 'input', attrs: { type: 'hidden', name: 'secret', value: '1' } },
      ],
      callbacks: ['onFormSubmit'],
      interactions: [{ type: 'submit', selector: 'form' }],
    },
    {
      name: 'nested FormField children',
      children: [
        {
          component: 'FormField',
          props: { label: 'Email', name: 'email' },
          children: [{ component: 'Input', props: { defaultValue: 'a@b.io' } }],
        },
      ],
      callbacks: ['onFormSubmit'],
      interactions: [{ type: 'submit', selector: 'form' }],
    },
    {
      name: 'reset button fires onReset',
      a11y: BARE_INPUTS,
      callbacks: ['onReset'],
      children: [
        { component: 'Input', props: { name: 'email', defaultValue: 'a@b.io' } },
        { component: 'Button', props: { type: 'reset' }, children: ['Reset'] },
      ],
      interactions: [{ type: 'click', selector: 'button[type="reset"]' }],
    },
    {
      name: 'className, style and testId',
      a11y: BARE_INPUTS,
      props: { className: 'parity-token', style: { marginTop: '4px' }, testId: 'signup' },
      children: [{ component: 'Input', props: { name: 'email' } }],
    },
  ],
}
