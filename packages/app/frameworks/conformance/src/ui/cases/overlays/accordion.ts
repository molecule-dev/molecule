/**
 * Accordion parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const ITEMS = [
  { value: 'details', header: 'Details', content: 'Details body' },
  { value: 'shipping', header: 'Shipping', content: 'Shipping body' },
  { value: 'returns', header: 'Returns', content: 'Returns body' },
]

/** Accordion: single vs multiple expansion, collapsible, controlled value, disabled items, onChange. */
export const accordionCases: UIComponentCases = {
  component: 'Accordion',
  keyedLists: [{ prop: 'items', selector: 'button' }],
  cases: [
    { name: 'defaults (all collapsed)', props: { items: ITEMS } },
    { name: 'defaultValue single', props: { items: ITEMS, defaultValue: 'shipping' } },
    { name: 'defaultValue array', props: { items: ITEMS, defaultValue: ['details', 'returns'] } },
    { name: 'controlled value single', props: { items: ITEMS, value: 'returns' } },
    { name: 'controlled value array', props: { items: ITEMS, value: ['shipping'] } },
    {
      name: 'className, style and testId',
      props: {
        items: ITEMS,
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'faq',
      },
    },
    {
      name: 'click expands an item',
      props: { items: ITEMS },
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'click collapses an expanded item',
      props: { items: ITEMS, defaultValue: 'details' },
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'single mode swaps the expanded item',
      props: { items: ITEMS },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'click', selector: 'div[data-state="closed"] button' },
      ],
    },
    {
      name: 'multiple mode keeps both expanded',
      props: { items: ITEMS, multiple: true },
      interactions: [
        { type: 'click', selector: 'button' },
        { type: 'click', selector: 'div[data-state="closed"] button' },
      ],
    },
    {
      name: 'not collapsible keeps the last item open',
      props: { items: ITEMS, collapsible: false, defaultValue: 'details' },
      interactions: [{ type: 'click', selector: 'div[data-state="open"] button' }],
    },
    {
      name: 'not collapsible still swaps items in single mode',
      props: { items: ITEMS, collapsible: false, defaultValue: 'details' },
      interactions: [{ type: 'click', selector: 'div[data-state="closed"] button' }],
    },
    {
      name: 'click calls onChange with the value',
      props: { items: ITEMS },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'multiple mode onChange receives an array',
      props: { items: ITEMS, multiple: true },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: 'button' }],
    },
    {
      name: 'controlled click fires onChange but keeps the value',
      props: { items: ITEMS, value: 'details' },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: 'div[data-state="closed"] button' }],
    },
    {
      name: 'disabled item does not toggle',
      props: {
        items: [
          { value: 'details', header: 'Details', content: 'Details body' },
          { value: 'shipping', header: 'Shipping', content: 'Shipping body', disabled: true },
        ],
      },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: 'button[disabled]' }],
    },
    {
      name: 'item header as nodes',
      props: {
        items: [
          {
            value: 'details',
            header: { $nodes: [{ tag: 'strong', children: ['Details'] }, ' for experts'] },
            content: 'Details body',
          },
          { value: 'shipping', header: 'Shipping', content: 'Shipping body' },
        ],
      },
    },
    {
      name: 'item content as nodes',
      props: { items: [{ value: 'details', header: 'Details', content: 'Details body' }] },
      interactions: [
        { type: 'click', selector: 'button' },
        {
          type: 'props',
          props: {
            items: [
              {
                value: 'details',
                header: 'Details',
                content: { $nodes: ['Rich ', { tag: 'strong', children: ['panel'] }, ' body'] },
              },
            ],
          },
        },
      ],
    },
    {
      name: 'item content as a component node',
      props: {
        items: [
          {
            value: 'details',
            header: 'Details',
            content: { $nodes: [{ component: 'Button', children: ['Panel action'] }] },
          },
        ],
        defaultValue: ['details'],
      },
    },
  ],
}
