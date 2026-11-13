/**
 * Select parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const plans = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
]

/** Select: sizes, placeholder, clearable, option groups, control and value-change events. */
export const selectCases: UIComponentCases = {
  component: 'Select',
  keyedLists: [{ prop: 'options', selector: 'option' }],
  cases: [
    { name: 'defaults', props: { options: plans, name: 'plan' } },
    ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      props: { size, options: plans, name: 'plan' },
    })),
    { name: 'label', props: { options: plans, label: 'Plan', name: 'plan' } },
    {
      name: 'label required',
      props: { options: plans, label: 'Plan', required: true, name: 'plan' },
    },
    { name: 'placeholder', props: { options: plans, placeholder: 'Choose a plan…', name: 'plan' } },
    {
      name: 'clearable without placeholder adds clear option',
      props: { options: plans, clearable: true, name: 'plan' },
    },
    {
      name: 'clearable with placeholder suppresses clear option',
      props: { options: plans, clearable: true, placeholder: 'Choose…', name: 'plan' },
    },
    {
      name: 'grouped options',
      props: {
        options: [
          { value: 's', label: 'Small', group: 'Size' },
          { value: 'm', label: 'Medium', group: 'Size' },
          { value: 'red', label: 'Red', group: 'Color' },
          { value: 'blue', label: 'Blue', group: 'Color' },
        ],
        name: 'variant',
      },
    },
    {
      name: 'mixed grouped and ungrouped options',
      props: {
        options: [
          { value: 'none', label: 'No style' },
          { value: 's', label: 'Small', group: 'Size' },
          { value: 'm', label: 'Medium', group: 'Size' },
        ],
        name: 'variant',
      },
    },
    {
      name: 'disabled option',
      props: {
        options: [
          { value: 'a', label: 'Available' },
          { value: 'b', label: 'Unavailable', disabled: true },
        ],
        name: 'pick',
      },
    },
    { name: 'empty options', props: { options: [], name: 'plan' } },
    { name: 'error', props: { options: plans, error: 'Pick a plan to continue.', name: 'plan' } },
    { name: 'hint', props: { options: plans, hint: 'You can switch later.', name: 'plan' } },
    {
      name: 'error overrides hint',
      props: { options: plans, error: 'Required.', hint: 'Optional.', name: 'plan' },
    },
    { name: 'disabled', props: { options: plans, disabled: true, name: 'plan' } },
    { name: 'explicit id', props: { options: plans, id: 'plan-field', label: 'Plan' } },
    {
      name: 'controlled change reports value',
      props: { options: plans, value: 'free', name: 'plan' },
      callbacks: ['onChange', 'onValueChange'],
      interactions: [{ type: 'input', selector: 'select', value: 'pro' }],
    },
    {
      name: 'uncontrolled change keeps selection',
      props: { options: plans, defaultValue: 'free', name: 'plan' },
      callbacks: ['onChange', 'onValueChange'],
      interactions: [{ type: 'input', selector: 'select', value: 'enterprise' }],
    },
    {
      name: 'value with no matching option',
      props: { options: plans, value: 'ghost', name: 'plan' },
      callbacks: ['onChange', 'onValueChange'],
    },
    {
      name: 'value changes on re-render',
      props: { options: plans, value: 'free', name: 'plan' },
      callbacks: ['onChange', 'onValueChange'],
      interactions: [{ type: 'props', props: { value: 'pro' } }],
    },
    { name: 'multiple passthrough', props: { options: plans, multiple: true, name: 'plan' } },
    {
      name: 'className, style and testId',
      props: {
        options: plans,
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'plan',
        name: 'plan',
      },
    },
    {
      name: 'passes through aria and data attributes',
      props: {
        options: plans,
        'aria-label': 'Subscription plan',
        'data-mol-id': 'plan-select',
        name: 'plan',
      },
    },
  ],
}
