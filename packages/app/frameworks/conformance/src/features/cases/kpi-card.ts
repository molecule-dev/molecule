/**
 * `@molecule/app-kpi-card-react` cases: the dashboard metric primitives —
 * `<KpiCard>` (one metric under a label, with icon, trend and action slots),
 * `<KpiCardTrend>` (an arrow glyph plus a signed delta) and `<KpiCardGrid>`
 * (the fixed-column grid the cards sit in).
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The label/value pair almost every card case shares. */
const title = ['Revenue']
const value = ['$48,200']

/** `@molecule/app-kpi-card-react`. */
export const kpiCardFeature: FeatureCases = {
  package: '@molecule/app-kpi-card-react',
  families: [
    {
      component: 'KpiCard',
      cases: [
        { name: 'title and value', slots: { title, value } },
        { name: 'an empty card renders both rows empty' },
        {
          name: 'subtitle below the value',
          slots: { title, value, subtitle: ['vs. last week'] },
        },
        {
          name: 'a trend indicator',
          slots: {
            title,
            value,
            trend: [{ tag: 'span', attrs: { 'data-trend': '' }, children: ['+12.4%'] }],
          },
        },
        {
          name: 'a trend indicator and a subtitle',
          slots: {
            title,
            value,
            trend: [{ tag: 'span', attrs: { 'data-trend': '' }, children: ['▲ 12.4%'] }],
            subtitle: ['vs. last week'],
          },
        },
        {
          name: 'icon and action slots',
          slots: {
            title,
            value,
            icon: [{ tag: 'i', attrs: { 'data-icon': '' } }],
            action: [{ tag: 'button', attrs: { 'data-action': '' }, children: ['More'] }],
          },
        },
        {
          name: 'title and value as elements',
          slots: {
            title: [
              { tag: 'strong', children: ['Monthly ', { tag: 'em', children: ['revenue'] }] },
            ],
            value: [{ tag: 'span', attrs: { 'data-value': '' }, children: ['$48,200'] }],
          },
        },
        { name: 'accent on the left', props: { accentSide: 'left' }, slots: { title, value } },
        { name: 'accent on the top', props: { accentSide: 'top' }, slots: { title, value } },
        { name: 'no accent side', props: { accentSide: 'none' }, slots: { title, value } },
        {
          name: 'a custom accent colour',
          props: { accentSide: 'left', accentColor: 'border-success' },
          slots: { title, value },
        },
        {
          name: 'a custom accent colour with no accent drawn',
          props: { accentColor: 'border-success' },
          slots: { title, value },
        },
        { name: 'an uppercase label', props: { upperLabel: true }, slots: { title, value } },
        { name: 'an emphasised value', props: { emphasizeValue: true }, slots: { title, value } },
        { name: 'a hover lift', props: { hoverLift: true }, slots: { title, value } },
        {
          name: 'className and data-mol-id',
          props: { className: 'parity-token', dataMolId: 'kpi-revenue' },
          slots: { title, value },
        },
        {
          name: 'the accent side changes',
          props: { accentSide: 'left' },
          slots: { title, value },
          interactions: [
            { type: 'props', props: { accentSide: 'top' } },
            { type: 'props', props: { accentSide: 'none' } },
            { type: 'props', props: { accentSide: 'left' } },
          ],
        },
        {
          name: 'the label and value styling changes',
          props: { upperLabel: true, emphasizeValue: true, hoverLift: true },
          slots: { title, value },
          interactions: [
            {
              type: 'props',
              props: { upperLabel: false, emphasizeValue: false, hoverLift: false },
            },
          ],
        },
        {
          name: 'className and data-mol-id change',
          props: { className: 'parity-token', dataMolId: 'first-id' },
          slots: { title, value },
          interactions: [
            { type: 'props', props: { className: 'parity-other', dataMolId: 'second-id' } },
            { type: 'props', props: { dataMolId: undefined } },
          ],
        },
      ],
    },
    {
      component: 'KpiCardTrend',
      cases: [
        { name: 'a positive delta', props: { delta: 12.3 } },
        { name: 'a negative delta', props: { delta: -4 } },
        { name: 'a zero delta', props: { delta: 0 } },
        {
          name: 'an explicit up direction over a negative delta',
          props: { delta: -4, direction: 'up' },
        },
        {
          name: 'an explicit down direction over a positive delta',
          props: { delta: 9, direction: 'down' },
        },
        {
          name: 'an explicit flat direction over a positive delta',
          props: { delta: 9, direction: 'flat' },
        },
        { name: 'a custom suffix', props: { delta: 3, suffix: 'pts' } },
        { name: 'an empty suffix', props: { delta: 3, suffix: '' } },
        { name: 'className', props: { delta: 1, className: 'parity-token' } },
        {
          name: 'the delta changes sign',
          props: { delta: 12 },
          interactions: [
            { type: 'props', props: { delta: -3 } },
            { type: 'props', props: { delta: 0 } },
          ],
        },
        {
          name: 'direction and suffix change',
          props: { delta: 5 },
          interactions: [
            { type: 'props', props: { direction: 'down' } },
            { type: 'props', props: { suffix: 'pts' } },
          ],
        },
        {
          name: 'className changes',
          props: { delta: 1, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
      ],
    },
    {
      component: 'KpiCardGrid',
      cases: [
        {
          name: 'its children',
          children: [{ tag: 'span', attrs: { 'data-card': '' }, children: ['card-a'] }],
        },
        {
          name: 'two columns',
          props: { columns: 2 },
          children: [
            { tag: 'span', attrs: { 'data-card': '' }, children: ['a'] },
            { tag: 'span', attrs: { 'data-card': '' }, children: ['b'] },
          ],
        },
        { name: 'three columns', props: { columns: 3 }, children: ['x'] },
        { name: 'four columns', props: { columns: 4 }, children: ['x'] },
        { name: 'five columns', props: { columns: 5 }, children: ['x'] },
        { name: 'six columns', props: { columns: 6 }, children: ['x'] },
        { name: 'a small gap', props: { gap: 'xs' }, children: ['x'] },
        { name: 'a large gap', props: { gap: 'lg' }, children: ['x'] },
        { name: 'className', props: { className: 'parity-token' }, children: ['x'] },
        { name: 'no children' },
        {
          name: 'columns and gap change',
          props: { columns: 2, gap: 'xs' },
          children: ['x'],
          interactions: [
            { type: 'props', props: { columns: 5, gap: 'lg' } },
            { type: 'props', props: { columns: 4, gap: 'md' } },
          ],
        },
      ],
    },
  ],
}
