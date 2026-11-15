/**
 * `@molecule/app-info-display-react` cases: the label/value metadata display —
 * `<DefinitionList>` (a `dl` of stacked or gridded label/value pairs) and
 * `<InfoCard>` (a Card wrapping a DefinitionList under a title, with optional
 * icon and header actions).
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Two label/value pairs, the smallest list that shows the stacking. */
const fields = [
  { label: 'Industry', value: 'Technology' },
  { label: 'Founded', value: '2018' },
]

/** Three fields, for the column counts that arrange more than a pair. */
const threeFields = [...fields, { label: 'Employees', value: '120–150' }]

/** `@molecule/app-info-display-react`. */
export const infoDisplayFeature: FeatureCases = {
  package: '@molecule/app-info-display-react',
  families: [
    {
      component: 'DefinitionList',
      cases: [
        { name: 'default columns stack the fields', props: { fields } },
        { name: 'columns=2 arranges a grid', props: { fields: threeFields, columns: 2 } },
        { name: 'columns=3 arranges a grid', props: { fields: threeFields, columns: 3 } },
        {
          name: 'field icons render before the labels',
          props: {
            fields: [
              {
                label: 'Industry',
                value: 'Technology',
                icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': '' } }] },
              },
              { label: 'Founded', value: '2018', icon: '★' },
            ],
          },
        },
        {
          name: 'labels and values as nodes',
          props: {
            fields: [
              {
                label: { $nodes: [{ tag: 'strong', children: ['Industry'] }] },
                value: { $nodes: [{ tag: 'em', children: ['Technology'] }] },
              },
              {
                label: {
                  $nodes: [{ tag: 'span', attrs: { 'data-label': '' }, children: ['Plan'] }],
                },
                value: { $nodes: [{ tag: 'b', children: ['Pro'] }, ' plan'] },
              },
            ],
          },
        },
        { name: 'className is forwarded', props: { fields, className: 'parity-token' } },
        { name: 'an empty list renders an empty dl', props: { fields: [] } },
        {
          name: 'columns changes through all three',
          props: { fields: threeFields },
          interactions: [
            { type: 'props', props: { columns: 2 } },
            { type: 'props', props: { columns: 3 } },
            { type: 'props', props: { columns: 1 } },
          ],
        },
        {
          name: 'fields change in place',
          props: { fields },
          interactions: [
            {
              type: 'props',
              props: { fields: [{ label: 'Sector', value: 'Software' }] },
            },
            { type: 'props', props: { fields: [] } },
          ],
        },
        {
          name: 'className changes',
          props: { fields, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
      ],
    },
    {
      component: 'InfoCard',
      cases: [
        {
          name: 'title and fields',
          props: { fields },
          slots: { title: ['Company Details'] },
        },
        {
          name: 'icon and actions slots',
          props: { fields },
          slots: {
            title: ['Company Details'],
            icon: [{ tag: 'i', attrs: { 'data-icon': '' } }],
            actions: [{ tag: 'button', attrs: { 'data-actions': '' }, children: ['Edit'] }],
          },
        },
        {
          name: 'title as a node',
          props: { fields },
          slots: {
            title: [
              {
                tag: 'span',
                attrs: { 'data-title': '' },
                children: ['Company ', { tag: 'b', children: ['Details'] }],
              },
            ],
          },
        },
        {
          name: 'columns=2 arranges a grid',
          props: { fields: threeFields, columns: 2 },
          slots: { title: ['Company Details'] },
        },
        {
          name: 'columns=3 arranges a grid',
          props: { fields: threeFields, columns: 3 },
          slots: { title: ['Company Details'] },
        },
        {
          name: 'className and data-mol-id',
          props: { fields, className: 'parity-token', dataMolId: 'company-info-card' },
          slots: { title: ['Company Details'] },
        },
        {
          name: 'an empty card renders its header and an empty list',
          props: { fields: [] },
          slots: { title: ['Company Details'] },
        },
        {
          name: 'columns changes',
          props: { fields: threeFields },
          slots: { title: ['Company Details'] },
          interactions: [
            { type: 'props', props: { columns: 2 } },
            { type: 'props', props: { columns: 3 } },
          ],
        },
        {
          name: 'fields change in place',
          props: { fields },
          slots: { title: ['Company Details'] },
          interactions: [
            { type: 'props', props: { fields: [{ label: 'Sector', value: 'Software' }] } },
          ],
        },
        {
          name: 'className and data-mol-id change',
          props: { fields, className: 'parity-token', dataMolId: 'first-id' },
          slots: { title: ['Company Details'] },
          interactions: [
            { type: 'props', props: { className: 'parity-other', dataMolId: 'second-id' } },
            { type: 'props', props: { dataMolId: undefined } },
          ],
        },
      ],
    },
  ],
}
