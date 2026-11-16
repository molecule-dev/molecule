/**
 * `@molecule/app-filter-bar-react` cases: every field type (text, select,
 * multi, date-range), the labeled and unlabeled layouts, the optional clear
 * button and actions slot, and every callback they make.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A free-text field, labeled the way a consumer labels it. */
const textField = { id: 'q', type: 'text' as const, label: 'Search' }

/** A single-select field with two options. */
const selectField = {
  id: 'status',
  type: 'select' as const,
  label: 'Status',
  options: [
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
  ],
}

/** A multi field (a comma-joined text input) with two options. */
const multiField = {
  id: 'tags',
  type: 'multi' as const,
  label: 'Tags',
  options: [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ],
}

/** A date-range field (two date inputs). */
const dateField = { id: 'created', type: 'date-range' as const, label: 'Created' }

/** `@molecule/app-filter-bar-react`. */
export const filterBarFeature: FeatureCases = {
  package: '@molecule/app-filter-bar-react',
  families: [
    {
      component: 'FilterBar',
      cases: [
        {
          name: 'text field falls back to its label as the placeholder',
          props: { fields: [textField], values: {} },
          callbacks: ['onChange'],
        },
        {
          name: 'text field with a value and a custom placeholder',
          props: {
            fields: [{ ...textField, placeholder: 'Type here' }],
            values: { q: 'needle' },
          },
          callbacks: ['onChange'],
        },
        {
          name: 'select field with no selection',
          props: { fields: [selectField], values: {} },
          callbacks: ['onChange'],
        },
        {
          name: 'select field with a selection',
          props: { fields: [selectField], values: { status: 'closed' } },
          callbacks: ['onChange'],
        },
        {
          name: 'multi field is empty',
          props: { fields: [multiField], values: {} },
          callbacks: ['onChange'],
        },
        {
          name: 'multi field joins its values with commas',
          props: { fields: [multiField], values: { tags: ['a', 'b'] } },
          callbacks: ['onChange'],
        },
        {
          name: 'multi field with a custom placeholder',
          props: {
            fields: [{ ...multiField, placeholder: 'Add tags' }],
            values: {},
          },
          callbacks: ['onChange'],
        },
        {
          name: 'date-range field is empty',
          props: { fields: [dateField], values: {} },
          callbacks: ['onChange'],
        },
        {
          name: 'date-range field with both bounds',
          props: {
            fields: [dateField],
            values: { created: { from: '2024-01-01', to: '2024-02-01' } },
          },
          callbacks: ['onChange'],
        },
        {
          name: 'date-range field with only a from bound',
          props: { fields: [dateField], values: { created: { from: '2024-01-01' } } },
          callbacks: ['onChange'],
        },
        {
          name: 'showLabels wraps each field in a labeled column',
          props: {
            fields: [textField, selectField, multiField, dateField],
            values: {},
            showLabels: true,
          },
          callbacks: ['onChange'],
        },
        {
          name: 'showLabels with values',
          props: {
            fields: [textField, selectField, multiField, dateField],
            values: {
              q: 'needle',
              status: 'open',
              tags: ['a'],
              created: { from: '2024-01-01', to: '2024-02-01' },
            },
            showLabels: true,
          },
          callbacks: ['onChange'],
        },
        {
          name: 'every field type in one unlabeled row',
          props: { fields: [textField, selectField, multiField, dateField], values: {} },
          callbacks: ['onChange'],
        },
        {
          name: 'a clear button renders when onClear is supplied',
          props: { fields: [textField], values: {} },
          callbacks: ['onChange', 'onClear'],
        },
        {
          name: 'no clear button without onClear',
          props: { fields: [textField], values: {} },
          callbacks: ['onChange', 'onClear'],
        },
        {
          name: 'the actions slot renders after the fields',
          props: { fields: [textField], values: {} },
          slots: {
            actions: [{ tag: 'button', attrs: { type: 'button' }, children: ['Save view'] }],
          },
          callbacks: ['onChange'],
        },
        {
          name: 'actions beside the clear button',
          props: { fields: [textField], values: {} },
          slots: { actions: [{ tag: 'span', children: ['Saved'] }] },
          callbacks: ['onChange', 'onClear'],
        },
        {
          name: 'className lands on the row',
          props: { fields: [textField], values: {}, className: 'parity-token' },
          callbacks: ['onChange'],
        },
        {
          name: 'no fields renders an empty row',
          props: { fields: [], values: {} },
          callbacks: ['onChange'],
        },
        {
          name: 'typing in a text field emits the whole values map',
          props: { fields: [textField, selectField], values: { status: 'open' } },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input[aria-label="Search"]', value: 'needle' },
          ],
        },
        {
          name: 'a multi field splits on commas',
          props: { fields: [multiField], values: { tags: ['a'] } },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input[aria-label="Tags"]', value: ' a, b , c ' },
          ],
        },
        {
          name: 'a multi field clears to an empty list',
          props: { fields: [multiField], values: { tags: ['a', 'b'] } },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: 'input[aria-label="Tags"]', value: ' , ' }],
        },
        {
          name: 'choosing a select option emits its value',
          props: { fields: [selectField], values: { status: 'open' } },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: 'select', value: 'closed' }],
        },
        {
          name: 'changing a date-range bound keeps the other one',
          props: { fields: [dateField], values: { created: { from: '2024-01-01' } } },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input[aria-label="Created to"]', value: '2024-03-04' },
          ],
        },
        {
          name: 'changing the from bound of a date range',
          props: { fields: [dateField], values: { created: { to: '2024-02-02' } } },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'input[aria-label="Created from"]', value: '2024-01-01' },
          ],
        },
        {
          name: 'the clear button calls onClear',
          props: { fields: [textField], values: { q: 'needle' } },
          callbacks: ['onChange', 'onClear'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'values change re-renders the controls',
          props: { fields: [textField, selectField], values: {} },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { values: { q: 'typed', status: 'closed' } } }],
        },
        {
          name: 'showLabels can be turned on after mount',
          props: { fields: [textField], values: {} },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { showLabels: true } }],
        },
        {
          name: 'a field can change type',
          props: { fields: [textField], values: {} },
          callbacks: ['onChange'],
          interactions: [{ type: 'props', props: { fields: [selectField] } }],
        },
      ],
    },
  ],
}
