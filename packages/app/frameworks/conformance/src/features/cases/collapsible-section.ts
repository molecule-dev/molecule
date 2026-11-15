/**
 * `@molecule/app-collapsible-section-react` cases: the expandable section
 * (every heading level, both expansion modes, the badge / actions slots and
 * the click that must not toggle from inside the actions) and the
 * "show N more" list (the truncation count, both labels, their i18n keys and
 * the expanded / collapsed toggle).
 *
 * `CollapsibleSection` and `ShowMore` are the package's only runtime exports.
 * `onExpandedChange` receives the next expanded state (a boolean), so its
 * recorded call shows the value every framework passes.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Body content marking an expanded section. */
const body = [{ tag: 'p', attrs: { 'data-body': '' }, children: ['hidden body'] }]

/** A node-valued title, filling the `title` slot. */
const boldTitle = [{ tag: 'strong', children: ['Bold title'] }]

/** A badge node, filling the `badge` slot. */
const badge = [{ tag: 'span', attrs: { 'data-badge': '' }, children: ['3'] }]

/** An actions node holding something clickable, filling the `actions` slot. */
const actions = [
  {
    tag: 'span',
    attrs: { 'data-action': '' },
    children: ['⋯'],
  },
]

/** `initialCount` items, each carrying its index and text. */
const items = (
  count: number,
): { tag: string; attrs: Record<string, string>; children: string[] }[] =>
  Array.from({ length: count }, (_value, index) => ({
    tag: 'div',
    attrs: { 'data-item': String(index) },
    children: [`item-${index}`],
  }))

/** `@molecule/app-collapsible-section-react`. */
export const collapsibleSectionFeature: FeatureCases = {
  package: '@molecule/app-collapsible-section-react',
  families: [
    {
      component: 'CollapsibleSection',
      cases: [
        { name: 'collapsed by default', props: { title: 'Key concepts' }, children: body },
        {
          name: 'defaultExpanded shows the body',
          props: { title: 'T', defaultExpanded: true },
          children: body,
        },
        {
          name: 'controlled expanded true',
          props: { title: 'T', expanded: true },
          children: body,
        },
        {
          name: 'a controlled section stays collapsed but calls onExpandedChange',
          props: { title: 'T', expanded: false },
          callbacks: ['onExpandedChange'],
          children: body,
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'expanding and collapsing calls onExpandedChange',
          props: { title: 'T' },
          callbacks: ['onExpandedChange'],
          children: body,
          interactions: [
            { type: 'click', selector: 'button' },
            { type: 'click', selector: 'button' },
          ],
        },
        {
          name: 'a controlled section follows the expanded prop',
          props: { title: 'T', expanded: false },
          callbacks: ['onExpandedChange'],
          children: body,
          interactions: [
            { type: 'props', props: { expanded: true } },
            { type: 'props', props: { expanded: false } },
          ],
        },
        { name: 'level 2 heading', props: { title: 'T', level: 2 }, children: [] },
        { name: 'level 4 heading', props: { title: 'T', level: 4 }, children: [] },
        { name: 'level 5 heading', props: { title: 'T', level: 5 }, children: [] },
        { name: 'level 6 heading', props: { title: 'T', level: 6 }, children: [] },
        {
          name: 'a node title and node children',
          props: { defaultExpanded: true },
          slots: { title: boldTitle },
          children: [{ tag: 'em', children: ['Body'] }],
        },
        {
          name: 'badge and actions slots',
          props: { title: 'T' },
          slots: { badge, actions },
        },
        {
          name: 'a badge prop and an actions prop',
          props: { title: 'T', badge: { $nodes: badge }, actions: { $nodes: actions } },
        },
        {
          name: 'clicking inside the actions does not toggle',
          props: { title: 'T' },
          callbacks: ['onExpandedChange'],
          slots: { actions },
          children: body,
          interactions: [{ type: 'click', selector: '[data-action]' }],
        },
        {
          name: 'className passthrough',
          props: { title: 'T', className: 'parity-token' },
          children: [],
        },
        {
          name: 'an empty title',
          props: { title: '' },
          children: [],
        },
        {
          name: 'everything at once',
          props: { level: 4, defaultExpanded: true, className: 'parity-token' },
          slots: { title: boldTitle, badge, actions },
          children: body,
        },
        {
          name: 'prop changes',
          props: { title: 'T' },
          children: body,
          interactions: [
            { type: 'props', props: { className: 'parity-token' } },
            { type: 'props', props: { level: 5 } },
            { type: 'props', props: { defaultExpanded: true } },
          ],
        },
      ],
    },
    {
      component: 'ShowMore',
      cases: [
        { name: 'three items by default', children: items(5) },
        { name: 'initialCount 2', props: { initialCount: 2 }, children: items(5) },
        { name: 'all items fit within initialCount', children: items(2) },
        {
          name: 'expanding shows every item and the less label',
          children: items(5),
          interactions: [
            { type: 'click', selector: 'button' },
            { type: 'click', selector: 'button' },
          ],
        },
        {
          name: 'translations for the default keys',
          children: items(5),
          context: {
            translations: {
              en: {
                showMore: { more: 'Show {{remaining}} more items', less: 'Fewer items' },
              },
            },
          },
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'custom keys with translations',
          props: { moreKey: 'custom.more', lessKey: 'custom.less' },
          children: items(5),
          context: {
            translations: {
              en: { custom: { more: 'More ({{remaining}})', less: 'Less' } },
            },
          },
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'custom keys without translations keep the English defaults',
          props: { moreKey: 'custom.more', lessKey: 'custom.less' },
          children: items(5),
          interactions: [{ type: 'click', selector: 'button' }],
        },
        { name: 'className passthrough', props: { className: 'parity-token' }, children: items(2) },
        { name: 'two items render no toggle', children: items(2) },
        { name: 'empty children render no toggle', children: [] },
        {
          name: 'initialCount 0',
          props: { initialCount: 0 },
          children: items(3),
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'initialCount larger than the list',
          props: { initialCount: 5 },
          children: items(2),
        },
        {
          name: 'prop changes',
          children: items(5),
          interactions: [
            { type: 'props', props: { initialCount: 1 } },
            { type: 'props', props: { className: 'parity-token' } },
          ],
        },
        {
          name: 'an initialCount change after expanding keeps every item',
          children: items(5),
          interactions: [
            { type: 'click', selector: 'button' },
            { type: 'props', props: { initialCount: 1 } },
          ],
        },
      ],
    },
  ],
}
