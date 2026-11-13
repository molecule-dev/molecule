/**
 * Tabs parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const ITEMS = [
  { value: 'account', label: 'Account', content: 'Account settings' },
  { value: 'profile', label: 'Profile', content: 'Profile settings' },
  { value: 'billing', label: 'Billing', content: 'Billing settings' },
]

/** Tabs: variants, sizes, fitted, controlled/uncontrolled selection, roving-tabindex keyboard model. */
export const tabsCases: UIComponentCases = {
  component: 'Tabs',
  cases: [
    { name: 'defaults', props: { items: ITEMS } },
    { name: 'defaultValue selects a tab', props: { items: ITEMS, defaultValue: 'profile' } },
    { name: 'controlled value', props: { items: ITEMS, value: 'billing' } },
    ...(['line', 'enclosed', 'soft-rounded', 'solid-rounded'] as const).map((variant) => ({
      name: `variant ${variant}`,
      props: { items: ITEMS, variant },
    })),
    ...(['xs', 'sm', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      props: { items: ITEMS, size },
    })),
    { name: 'fitted', props: { items: ITEMS, fitted: true } },
    {
      name: 'items without content render no panel',
      props: { items: ITEMS.map(({ value, label }) => ({ value, label })) },
    },
    {
      name: 'active item without content renders no panel',
      props: {
        items: [
          { value: 'a', label: 'A', content: 'A body' },
          { value: 'b', label: 'B' },
        ],
        value: 'b',
      },
    },
    {
      name: 'className, style and testId',
      props: {
        items: ITEMS,
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'settings-tabs',
      },
    },
    {
      name: 'click selects a tab',
      props: { items: ITEMS },
      interactions: [{ type: 'click', selector: '[role="tab"]:nth-of-type(2)' }],
    },
    {
      name: 'click calls onChange with the value',
      props: { items: ITEMS },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: '[role="tab"]:nth-of-type(3)' }],
    },
    {
      name: 'controlled click fires onChange but keeps the value',
      props: { items: ITEMS, value: 'account' },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: '[role="tab"]:nth-of-type(2)' }],
    },
    {
      name: 'arrow right moves selection',
      props: { items: ITEMS },
      interactions: [{ type: 'keydown', selector: '[role="tablist"]', key: 'ArrowRight' }],
    },
    {
      name: 'arrow left wraps to the last tab',
      props: { items: ITEMS },
      interactions: [{ type: 'keydown', selector: '[role="tablist"]', key: 'ArrowLeft' }],
    },
    {
      name: 'home and end move selection',
      props: { items: ITEMS, defaultValue: 'profile' },
      interactions: [
        { type: 'keydown', selector: '[role="tablist"]', key: 'End' },
        { type: 'keydown', selector: '[role="tablist"]', key: 'Home' },
      ],
    },
    {
      name: 'arrow keys skip disabled tabs',
      props: {
        items: [
          { value: 'a', label: 'A', content: 'A body' },
          { value: 'b', label: 'B', content: 'B body', disabled: true },
          { value: 'c', label: 'C', content: 'C body' },
        ],
      },
      interactions: [{ type: 'keydown', selector: '[role="tablist"]', key: 'ArrowRight' }],
    },
    {
      name: 'disabled tab click does not call onChange',
      props: {
        items: [
          { value: 'a', label: 'A', content: 'A body' },
          { value: 'b', label: 'B', content: 'B body', disabled: true },
        ],
      },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: '[role="tab"]:nth-of-type(2)' }],
    },
    {
      name: 'item icon as a component node',
      props: {
        items: [
          {
            value: 'a',
            label: 'A',
            content: 'A body',
            icon: { $nodes: [{ component: 'Icon', props: { name: 'star' } }] },
          },
          {
            value: 'b',
            label: 'B',
            content: 'B body',
            icon: { $nodes: [{ component: 'Icon', props: { name: 'heart' } }] },
          },
          { value: 'c', label: 'C', content: 'C body' },
        ],
      },
    },
    {
      name: 'item label as an element node',
      props: {
        items: [
          {
            value: 'a',
            label: { $nodes: [{ tag: 'strong', children: ['Bold tab'] }] },
            content: 'A body',
          },
          { value: 'b', label: 'B', content: 'B body' },
        ],
      },
    },
    {
      name: 'item content as nodes',
      props: {
        items: [
          {
            value: 'a',
            label: 'A',
            content: { $nodes: ['Rich ', { tag: 'strong', children: ['panel'] }, ' body'] },
          },
          {
            value: 'b',
            label: 'B',
            content: { $nodes: [{ component: 'Button', children: ['B action'] }] },
          },
        ],
      },
      interactions: [{ type: 'click', selector: '[role="tab"]:nth-of-type(2)' }],
    },
    {
      name: 'arrow right moves focus to the newly active tab',
      props: { items: ITEMS },
      interactions: [{ type: 'keydown', selector: '[role="tablist"]', key: 'ArrowRight' }],
    },
    {
      name: 'arrow left wraps focus to the last tab',
      props: { items: ITEMS },
      interactions: [{ type: 'keydown', selector: '[role="tablist"]', key: 'ArrowLeft' }],
    },
  ],
}
