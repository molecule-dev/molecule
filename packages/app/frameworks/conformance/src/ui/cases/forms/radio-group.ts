/**
 * RadioGroup parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const flavors = [
  { value: 'vanilla', label: 'Vanilla' },
  { value: 'chocolate', label: 'Chocolate' },
  { value: 'strawberry', label: 'Strawberry' },
]

/** RadioGroup: direction, labels, selection, disabled options and per-option change events. */
export const radioGroupCases: UIComponentCases = {
  component: 'RadioGroup',
  keyedLists: [{ prop: 'options', selector: 'input[type="radio"]' }],
  cases: [
    { name: 'defaults vertical', props: { options: flavors, name: 'flavor' } },
    { name: 'horizontal', props: { options: flavors, direction: 'horizontal', name: 'flavor' } },
    { name: 'group label', props: { options: flavors, label: 'Favorite flavor', name: 'flavor' } },
    {
      name: 'value selected',
      props: { options: flavors, value: 'chocolate', name: 'flavor' },
      callbacks: ['onChange'],
    },
    { name: 'error', props: { options: flavors, error: 'Pick one to continue.', name: 'flavor' } },
    {
      name: 'label with error',
      props: { options: flavors, label: 'Favorite flavor', error: 'Pick one.', name: 'flavor' },
    },
    { name: 'disabled group', props: { options: flavors, disabled: true, name: 'flavor' } },
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
    {
      name: 'disabled selected option',
      props: {
        options: [
          { value: 'a', label: 'Available' },
          { value: 'b', label: 'Unavailable', disabled: true },
        ],
        value: 'b',
        name: 'pick',
      },
      callbacks: ['onChange'],
    },
    {
      name: 'single option',
      props: { options: [{ value: 'only', label: 'Only choice' }], name: 'pick' },
    },
    { name: 'empty options', props: { options: [], name: 'pick' } },
    {
      name: 'click reports selection',
      props: { options: flavors, name: 'flavor' },
      callbacks: ['onChange'],
      interactions: [{ type: 'check', selector: 'input[value="chocolate"]', checked: true }],
    },
    {
      name: 'click switches selection',
      props: { options: flavors, value: 'vanilla', name: 'flavor' },
      callbacks: ['onChange'],
      interactions: [{ type: 'check', selector: 'input[value="strawberry"]', checked: true }],
    },
    {
      name: 'className, style and testId',
      props: {
        options: flavors,
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'flavors',
        name: 'flavor',
      },
    },
  ],
}
