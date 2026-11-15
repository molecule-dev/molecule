/**
 * `@molecule/app-card-grid-react` cases: the responsive `CardGrid` and the
 * span / named-areas `BentoGrid`, in every prop branch.
 *
 * @module
 */

import type { NodesValue } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** A card child, the way a caller fills `CardGrid`'s children. */
const cards = [
  { tag: 'div', attrs: { 'data-card': 'a' }, children: ['A'] },
  { tag: 'div', attrs: { 'data-card': 'b' }, children: ['B'] },
]

/** A node-valued item content: React's `ReactNode` inside a data prop. */
const node = (tag: string, text: string, attrs?: Record<string, string>): NodesValue => ({
  $nodes: [{ tag, attrs, children: [text] }],
})

/** One bento item with a node content. */
const item = (
  id: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> & { id: string } => ({
  id,
  content: node('div', id, { 'data-item': id }),
  ...extra,
})

/** Two default bento items. */
const items = [item('a'), item('b')]

/** `@molecule/app-card-grid-react`. */
export const cardGridFeature: FeatureCases = {
  package: '@molecule/app-card-grid-react',
  families: [
    {
      component: 'CardGrid',
      cases: [
        { name: 'default columns and gap', children: cards },
        { name: 'one column', props: { columns: 1 }, children: cards },
        { name: 'two columns', props: { columns: 2 }, children: cards },
        { name: 'four columns', props: { columns: 4 }, children: cards },
        { name: 'five columns', props: { columns: 5 }, children: cards },
        { name: 'six columns', props: { columns: 6 }, children: cards },
        { name: 'xs gap', props: { gap: 'xs' }, children: cards },
        { name: 'sm gap', props: { gap: 'sm' }, children: cards },
        { name: 'md gap', props: { gap: 'md' }, children: cards },
        { name: 'lg gap', props: { gap: 'lg' }, children: cards },
        { name: 'className passthrough', props: { className: 'parity-token' }, children: cards },
        { name: 'text child', children: ['Plain text'] },
        { name: 'no children', props: {} },
        {
          name: 'columns change',
          props: { columns: 2 },
          children: cards,
          interactions: [{ type: 'props', props: { columns: 5 } }],
        },
        {
          name: 'gap change',
          props: { gap: 'sm' },
          children: cards,
          interactions: [{ type: 'props', props: { gap: 'lg' } }],
        },
        {
          name: 'className change',
          props: { className: 'parity-token' },
          children: cards,
          interactions: [{ type: 'props', props: { className: 'other-token' } }],
        },
        {
          name: 'className removed',
          props: { className: 'parity-token' },
          children: cards,
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
      ],
    },
    {
      component: 'BentoGrid',
      cases: [
        { name: 'default spans and columns', props: { items } },
        { name: 'custom column span', props: { items: [item('a', { colSpan: 6 })] } },
        { name: 'custom row span', props: { items: [item('a', { rowSpan: 2 })] } },
        {
          name: 'column and row span',
          props: { items: [item('a', { colSpan: 8, rowSpan: 3 })] },
        },
        {
          name: 'mixed spans',
          props: { items: [item('a', { colSpan: 8, rowSpan: 2 }), item('b')] },
        },
        {
          name: 'areas mode',
          props: {
            areas: "'a a b' 'c d d'",
            items: [item('a', { area: 'a' }), item('b', { area: 'b' })],
          },
        },
        {
          name: 'areas mode with an item missing its area',
          props: { areas: "'a b'", items: [item('a', { area: 'a' }), item('b')] },
        },
        {
          name: 'areas mode ignores columns',
          props: { areas: "'a b'", columns: 4, items: [item('a', { area: 'a' })] },
        },
        { name: 'custom columns', props: { columns: 6, items } },
        { name: 'single column', props: { columns: 1, items } },
        { name: 'many columns', props: { columns: 24, items } },
        { name: 'xs gap', props: { gap: 'xs', items } },
        { name: 'sm gap', props: { gap: 'sm', items } },
        { name: 'md gap', props: { gap: 'md', items } },
        { name: 'lg gap', props: { gap: 'lg', items } },
        { name: 'className passthrough', props: { items, className: 'parity-token' } },
        { name: 'empty items', props: { items: [] } },
        { name: 'text content', props: { items: [{ id: 'a', content: 'Plain text' }] } },
        {
          name: 'nested element content',
          props: {
            items: [
              {
                id: 'a',
                content: {
                  $nodes: [
                    {
                      tag: 'div',
                      children: [
                        { tag: 'span', attrs: { 'data-nested': '' }, children: ['Inner'] },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          name: 'columns change',
          props: { columns: 6, items },
          interactions: [{ type: 'props', props: { columns: 3 } }],
        },
        {
          name: 'gap change',
          props: { gap: 'sm', items },
          interactions: [{ type: 'props', props: { gap: 'lg' } }],
        },
        {
          name: 'items change',
          props: { items },
          interactions: [{ type: 'props', props: { items: [item('c', { colSpan: 12 })] } }],
        },
        {
          name: 'switches to areas mode',
          props: { items: [item('a'), item('b')] },
          interactions: [
            {
              type: 'props',
              props: {
                areas: "'a b'",
                items: [item('a', { area: 'a' }), item('b', { area: 'b' })],
              },
            },
          ],
        },
        {
          name: 'leaves areas mode',
          props: { areas: "'a b'", items: [item('a', { area: 'a' }), item('b', { area: 'b' })] },
          interactions: [{ type: 'props', props: { areas: undefined, items } }],
        },
        {
          name: 'className change',
          props: { items, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'other-token' } }],
        },
        {
          name: 'props change span and content',
          props: { items: [item('a')] },
          interactions: [
            {
              type: 'props',
              props: { items: [item('a', { colSpan: 6, rowSpan: 2 }), item('b')] },
            },
          ],
        },
      ],
    },
  ],
}
