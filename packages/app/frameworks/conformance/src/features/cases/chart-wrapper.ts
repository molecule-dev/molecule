/**
 * `@molecule/app-chart-wrapper-react` cases: the chart card's chrome (title,
 * description, actions, summary, body, footer, minimum chart height) and the
 * chart legend (swatches, labels, values, hidden series, toggle buttons,
 * both layouts).
 *
 * Neither component reads a service; the legend's only callback is
 * `onToggle`, recorded by the click cases. Every other branch is chosen by
 * props alone, so the interactions change props and the snapshots show the
 * re-rendered DOM.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const chart = [{ tag: 'div', attrs: { 'data-chart': '' }, children: ['plot'] }]
const title = [{ tag: 'strong', children: ['Revenue'] }]
const description = [{ tag: 'em', children: ['Last 12 months'] }]
const actions = [
  { tag: 'button', attrs: { type: 'button', 'data-actions': '' }, children: ['30d'] },
]
const summary = [{ tag: 'span', attrs: { 'data-summary': '' }, children: ['Total 12,345'] }]
const footer = [{ tag: 'small', attrs: { 'data-footer': '' }, children: ['Source: ledger'] }]

const items = [
  { id: 's1', label: 'Series 1', color: '#f00' },
  { id: 's2', label: 'Series 2', color: '#0f0', value: '42' },
]
const hiddenItems = [
  { id: 's1', label: 'Visible', color: '#f00' },
  { id: 's2', label: 'Hidden', color: '#0f0', hidden: true },
]

/** `@molecule/app-chart-wrapper-react`. */
export const chartWrapperFeature: FeatureCases = {
  package: '@molecule/app-chart-wrapper-react',
  families: [
    {
      component: 'ChartCard',
      cases: [
        {
          name: 'title and chart only',
          props: { title: 'Revenue' },
          children: chart,
        },
        {
          name: 'title as a node',
          slots: { title },
          children: chart,
        },
        {
          name: 'a description plus every other slot',
          props: { title: 'Revenue', description: 'Last 12 months', minChartHeight: 300 },
          slots: { actions, summary, footer },
          children: chart,
        },
        {
          name: 'node description, actions, summary and footer',
          props: { title: 'Revenue' },
          slots: { description, actions, summary, footer },
          children: chart,
        },
        {
          name: 'an empty description renders no paragraph',
          props: { title: 'Revenue', description: '' },
          children: chart,
        },
        {
          name: 'default minimum chart height',
          props: { title: 'Revenue' },
          children: chart,
        },
        {
          name: 'custom minimum chart height',
          props: { title: 'Revenue', minChartHeight: 400 },
          children: chart,
        },
        {
          name: 'minimum chart height changes',
          props: { title: 'Revenue' },
          children: chart,
          interactions: [{ type: 'props', props: { minChartHeight: 320 } }],
        },
        {
          name: 'className and dataMolId passthrough',
          props: { title: 'Revenue', className: 'parity-token', dataMolId: 'chart-x' },
          children: chart,
        },
        {
          name: 'description appears then disappears',
          props: { title: 'Revenue' },
          children: chart,
          interactions: [
            { type: 'props', props: { description: 'Last 12 months' } },
            { type: 'props', props: { description: '' } },
          ],
        },
        {
          name: 'title changes',
          props: { title: 'Revenue' },
          children: chart,
          interactions: [{ type: 'props', props: { title: 'Expenses' } }],
        },
        {
          name: 'text children',
          props: { title: 'Revenue' },
          children: ['nothing to plot yet'],
        },
      ],
    },
    {
      component: 'ChartLegend',
      cases: [
        { name: 'labels and swatches', props: { items } },
        {
          name: 'a value of zero renders',
          props: { items: [{ id: 'z', label: 'Z', color: '#00f', value: 0 }] },
        },
        { name: 'vertical layout', props: { items, layout: 'vertical' } },
        { name: 'hidden series', props: { items: hiddenItems } },
        { name: 'an empty list', props: { items: [] } },
        {
          name: 'node labels and values',
          props: {
            items: [
              {
                id: 'n1',
                label: { $nodes: [{ tag: 'strong', children: ['Bold'] }] },
                color: '#f00',
              },
              {
                id: 'n2',
                label: 'Series',
                color: '#0f0',
                value: { $nodes: [{ tag: 'code', children: ['42'] }] },
              },
            ],
          },
        },
        { name: 'className passthrough', props: { items, className: 'leg-cls' } },
        {
          name: 'toggle buttons call onToggle',
          props: { items },
          callbacks: ['onToggle'],
          interactions: [{ type: 'click', selector: 'button:nth-of-type(1)' }],
        },
        {
          name: 'toggle buttons reflect visibility',
          props: { items: hiddenItems },
          callbacks: ['onToggle'],
          interactions: [
            { type: 'click', selector: 'button:nth-of-type(1)' },
            { type: 'click', selector: 'button:nth-of-type(2)' },
          ],
        },
        {
          name: 'layout changes',
          props: { items },
          interactions: [{ type: 'props', props: { layout: 'vertical' } }],
        },
        {
          name: 'a series is hidden then shown',
          props: { items },
          interactions: [
            {
              type: 'props',
              props: {
                items: [
                  { id: 's1', label: 'Series 1', color: '#f00' },
                  { id: 's2', label: 'Series 2', color: '#0f0', value: '42', hidden: true },
                ],
              },
            },
            { type: 'props', props: { items } },
          ],
        },
      ],
    },
  ],
}
