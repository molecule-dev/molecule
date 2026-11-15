/**
 * `@molecule/app-sort-picker-react` cases: the standalone single-select sort
 * menu, its label variants, its aria naming and the change callback.
 *
 * @module
 */

import type { NodeSpec } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

const options = [
  { value: 'recent', label: 'Most recent' },
  { value: 'popular', label: 'Most popular' },
]

/** A rich label node, the shape a caller passes for a styled label. */
const richLabel: NodeSpec[] = [
  { tag: 'strong', attrs: { 'data-testid': 'rich-label' }, children: ['Sort results'] },
]

/** `@molecule/app-sort-picker-react`. */
export const sortPickerFeature: FeatureCases = {
  package: '@molecule/app-sort-picker-react',
  families: [
    {
      component: 'SortPicker',
      keyedLists: [{ prop: 'options', selector: 'option' }],
      cases: [
        { name: 'defaults: the translated label inline', props: { value: 'recent', options } },
        {
          name: 'explicit inline position',
          props: { value: 'recent', options, labelPosition: 'inline' },
        },
        { name: 'a custom string label', props: { value: 'recent', options, label: 'Order' } },
        { name: 'reflects the current value', props: { value: 'popular', options } },
        {
          name: 'a node label renders as nodes',
          props: { value: 'recent', options },
          slots: { label: richLabel },
        },
        {
          name: 'ariaLabel names the select when the label is a node',
          props: { value: 'recent', options, ariaLabel: 'Sort the results' },
          slots: { label: richLabel },
        },
        {
          name: 'a node label falls back to the default aria-label',
          props: { value: 'recent', options },
          slots: { label: [{ tag: 'em', children: ['Order'] }] },
        },
        {
          name: 'a string label names the select',
          props: { value: 'recent', options, label: 'Order' },
        },
        {
          name: 'an explicit ariaLabel wins',
          props: { value: 'recent', options, ariaLabel: 'Sort the list', label: 'Order' },
        },
        {
          name: 'the label above the select',
          props: { value: 'recent', options, labelPosition: 'above' },
        },
        {
          name: 'the label above, customized and classed',
          props: {
            value: 'recent',
            options,
            label: 'Order',
            labelPosition: 'above',
            className: 'parity-token',
          },
        },
        {
          name: 'a node label above the select',
          props: { value: 'recent', options, labelPosition: 'above' },
          slots: { label: richLabel },
        },
        {
          name: 'a className on the inline layout',
          props: { value: 'recent', options, className: 'parity-token' },
        },
        { name: 'no options', props: { value: '', options: [] } },
        { name: 'a value no option carries', props: { value: 'ghost', options } },
        {
          name: 'selecting an option calls onChange',
          props: { value: 'recent', options },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: 'select', value: 'popular' }],
        },
        {
          name: 'an uncontrolled change still reports the value',
          props: { value: 'popular', options, label: 'Order' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: 'select', value: 'recent' },
            { type: 'input', selector: 'select', value: 'popular' },
          ],
        },
        {
          name: 'a new value prop moves the selection',
          props: { value: 'recent', options },
          interactions: [{ type: 'props', props: { value: 'popular' } }],
        },
        {
          name: 'the label position changes',
          props: { value: 'recent', options, label: 'Order' },
          interactions: [
            { type: 'props', props: { labelPosition: 'above' } },
            { type: 'props', props: { labelPosition: 'inline' } },
          ],
        },
        {
          name: 'the className changes',
          props: { value: 'recent', options, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
        {
          name: 'the label changes',
          props: { value: 'recent', options, label: 'Order' },
          interactions: [{ type: 'props', props: { label: 'Sorted by' } }],
        },
        {
          name: 'the options change',
          props: { value: 'recent', options },
          interactions: [
            {
              type: 'props',
              props: { options: [{ value: 'recent', label: 'Newest first' }] },
            },
          ],
        },
      ],
    },
  ],
}
