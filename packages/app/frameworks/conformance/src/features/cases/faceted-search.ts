/**
 * `@molecule/app-faceted-search-react` cases: the fixed filter bar, the
 * segmented control and the filter pill with its dropdown panel — every prop,
 * every enum value, the open/close state machine and its callbacks.
 *
 * @module
 */

import type { CaseA11y, NodeSpec } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The case's panel content holds a bare input without a label. */
const BARE_PANEL_INPUT: CaseA11y = {
  expect: ['label'],
  reason: "The case's panel content holds a bare input without a label",
}

/** Two segment options, the second carrying its own `data-mol-id`. */
const options = [
  { value: 'buy', label: 'Buy' },
  { value: 'rent', label: 'Rent', dataMolId: 'rent-tab' },
]

/** A fresh copy of the same two options, for a prop step that re-passes equal data. */
const otherOptions = [
  { value: 'buy', label: 'Buy' },
  { value: 'rent', label: 'Rent', dataMolId: 'rent-tab' },
]

/** Three segments, so a middle and a last segment are both covered. */
const threeOptions = [
  { value: 'all', label: 'All' },
  { value: 'sale', label: 'For sale' },
  { value: 'rent', label: 'To rent' },
]

/** Options whose labels are rich nodes rather than text. */
const nodeOptions = [
  {
    value: 'alpha',
    label: { $nodes: [{ tag: 'strong', attrs: { 'data-label': 'alpha' }, children: ['Alpha'] }] },
  },
  {
    value: 'beta',
    label: { $nodes: [{ tag: 'em', attrs: { 'data-label': 'beta' }, children: ['Beta'] }] },
  },
]

/** A rich label node for the pill's `label` prop. */
const richLabel: NodeSpec[] = [
  { tag: 'strong', attrs: { 'data-testid': 'rich-label' }, children: ['Price'] },
]

/** Panel content with several nodes, the shape a real price panel has. */
const panelContent: NodeSpec[] = [
  { tag: 'label', attrs: { 'data-panel': 'min' }, children: ['Min'] },
  { tag: 'input', attrs: { type: 'range', 'data-panel': 'range' } },
  { tag: 'span', attrs: { 'data-panel': 'max' }, children: ['Max'] },
]

/** A single panel node, for the cases that only need the panel to exist. */
const onePanelNode: NodeSpec[] = [
  { tag: 'span', attrs: { 'data-panel': 'body' }, children: ['Body'] },
]

/** The pill's trigger is the only button inside its wrapper. */
const trigger = 'button'

/** `@molecule/app-faceted-search-react`. */
export const facetedSearchFeature: FeatureCases = {
  package: '@molecule/app-faceted-search-react',
  families: [
    {
      component: 'FacetedSearchBar',
      cases: [
        {
          name: 'defaults: a 64px offset',
          children: [{ tag: 'span', attrs: { 'data-item': 'one' }, children: ['Filters'] }],
        },
        {
          name: 'no children',
        },
        {
          name: 'zero offset',
          props: { topOffsetPx: 0 },
          children: [{ tag: 'span', attrs: { 'data-item': 'one' }, children: ['Filters'] }],
        },
        {
          name: 'a larger offset',
          props: { topOffsetPx: 128 },
          children: [{ tag: 'span', attrs: { 'data-item': 'one' }, children: ['Filters'] }],
        },
        {
          name: 'several children',
          children: [
            { tag: 'span', attrs: { 'data-item': 'one' }, children: ['Buy'] },
            { tag: 'span', attrs: { 'data-item': 'two' }, children: ['Rent'] },
            'Prices',
          ],
        },
        {
          name: 'className passthrough',
          props: { className: 'parity-token' },
          children: [{ tag: 'span', attrs: { 'data-item': 'one' }, children: ['Filters'] }],
        },
        {
          name: 'the offset changes',
          props: { topOffsetPx: 64 },
          children: [{ tag: 'span', attrs: { 'data-item': 'one' }, children: ['Filters'] }],
          interactions: [
            { type: 'props', props: { topOffsetPx: 32 } },
            { type: 'props', props: { topOffsetPx: undefined } },
          ],
        },
        {
          name: 'the className changes',
          props: { className: 'parity-token' },
          children: [{ tag: 'span', attrs: { 'data-item': 'one' }, children: ['Filters'] }],
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
      ],
    },
    {
      component: 'SegmentedControl',
      keyedLists: [{ prop: 'options', selector: '[role="tab"]' }],
      cases: [
        { name: 'two options, the first selected', props: { options, value: 'buy' } },
        { name: 'the second option selected', props: { options, value: 'rent' } },
        { name: 'three options', props: { options: threeOptions, value: 'sale' } },
        { name: 'a value no option carries', props: { options, value: 'ghost' } },
        { name: 'no options', props: { options: [], value: 'buy' } },
        { name: 'node labels', props: { options: nodeOptions, value: 'alpha' } },
        {
          name: 'className passthrough',
          props: { options, value: 'buy', className: 'parity-token' },
        },
        {
          name: 'clicking a segment calls onChange',
          props: { options, value: 'buy' },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[role="tab"]:nth-of-type(2)' }],
        },
        {
          name: 'clicking the selected segment still calls onChange',
          props: { options, value: 'rent' },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[role="tab"]:nth-of-type(2)' }],
        },
        {
          name: 'each segment calls with its own value',
          props: { options: threeOptions, value: 'all' },
          callbacks: ['onChange'],
          interactions: [
            { type: 'click', selector: '[role="tab"]:nth-of-type(2)' },
            { type: 'click', selector: '[role="tab"]:nth-of-type(3)' },
          ],
        },
        {
          name: 'the value prop changes',
          props: { options, value: 'buy' },
          interactions: [{ type: 'props', props: { value: 'rent' } }],
        },
        {
          name: 'the options change',
          props: { options, value: 'buy' },
          interactions: [
            { type: 'props', props: { options: [{ value: 'all', label: 'All' }], value: 'all' } },
            { type: 'props', props: { options: otherOptions, value: 'rent' } },
          ],
        },
        {
          name: 'the className changes',
          props: { options, value: 'buy', className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
        {
          name: 'a dataMolId appears on a later render',
          props: { options: [{ value: 'buy', label: 'Buy' }], value: 'buy' },
          interactions: [
            {
              type: 'props',
              props: { options: [{ value: 'buy', label: 'Buy', dataMolId: 'buy-tab' }] },
            },
          ],
        },
      ],
    },
    {
      component: 'FilterPill',
      cases: [
        {
          name: 'a text label, closed',
          props: { label: 'Price' },
          children: onePanelNode,
        },
        {
          name: 'a node label, closed',
          slots: { label: richLabel },
          children: onePanelNode,
        },
        {
          name: 'the panel opens on click',
          props: { label: 'Price' },
          children: onePanelNode,
          interactions: [{ type: 'click', selector: trigger }],
        },
        {
          name: 'a second click closes the panel',
          props: { label: 'Price' },
          children: onePanelNode,
          interactions: [
            { type: 'click', selector: trigger },
            { type: 'click', selector: trigger },
          ],
        },
        {
          name: 'a node label with the panel open',
          slots: { label: richLabel },
          children: onePanelNode,
          interactions: [{ type: 'click', selector: trigger }],
        },
        {
          name: 'panel content with several nodes',
          a11y: BARE_PANEL_INPUT,
          props: { label: 'Price' },
          children: panelContent,
          interactions: [{ type: 'click', selector: trigger }],
        },
        {
          name: 'active and closed',
          props: { label: 'Price', active: true },
          children: onePanelNode,
        },
        {
          name: 'active and open',
          props: { label: 'Price', active: true },
          children: onePanelNode,
          interactions: [{ type: 'click', selector: trigger }],
        },
        {
          name: 'active on a later render',
          props: { label: 'Price' },
          children: onePanelNode,
          interactions: [{ type: 'props', props: { active: true } }],
        },
        {
          name: 'a hidden chevron',
          props: { label: 'Filters', hideChevron: true },
          children: onePanelNode,
        },
        {
          name: 'a leading icon',
          props: { label: 'Filters', leadingIcon: 'tune' },
          children: onePanelNode,
        },
        {
          name: 'a leading icon and a hidden chevron',
          props: { label: 'Filters', leadingIcon: 'tune', hideChevron: true },
          children: onePanelNode,
        },
        {
          name: 'the leading icon appears on a later render',
          props: { label: 'Filters' },
          children: onePanelNode,
          interactions: [{ type: 'props', props: { leadingIcon: 'tune' } }],
        },
        {
          name: 'the chevron toggles on later renders',
          props: { label: 'Filters' },
          children: onePanelNode,
          interactions: [
            { type: 'props', props: { hideChevron: true } },
            { type: 'props', props: { hideChevron: false } },
          ],
        },
        {
          name: 'the panel is right-aligned',
          props: { label: 'Filters', panelAlign: 'right' },
          children: onePanelNode,
          interactions: [{ type: 'click', selector: trigger }],
        },
        {
          name: 'the panel is left-aligned explicitly',
          props: { label: 'Filters', panelAlign: 'left' },
          children: onePanelNode,
          interactions: [{ type: 'click', selector: trigger }],
        },
        {
          name: 'the alignment changes while open',
          props: { label: 'Filters', panelAlign: 'left' },
          children: onePanelNode,
          interactions: [
            { type: 'click', selector: trigger },
            { type: 'props', props: { panelAlign: 'right' } },
          ],
        },
        {
          name: 'a dataMolId on the trigger',
          props: { label: 'Price', dataMolId: 'price-pill' },
          children: onePanelNode,
        },
        {
          name: 'the dataMolId changes',
          props: { label: 'Price', dataMolId: 'price-pill' },
          children: onePanelNode,
          interactions: [
            { type: 'props', props: { dataMolId: 'cost-pill' } },
            { type: 'props', props: { dataMolId: undefined } },
          ],
        },
        {
          name: 'no children: opening renders no panel',
          props: { label: 'Price' },
          interactions: [{ type: 'click', selector: trigger }],
        },
        {
          name: 'a mousedown outside closes the panel',
          props: { label: 'Price' },
          children: onePanelNode,
          interactions: [
            { type: 'click', selector: trigger },
            { type: 'pointerdown', selector: 'body' },
          ],
        },
        {
          name: 'a mousedown inside the panel keeps it open',
          a11y: BARE_PANEL_INPUT,
          props: { label: 'Price' },
          children: panelContent,
          interactions: [
            { type: 'click', selector: trigger },
            { type: 'pointerdown', selector: '[data-panel="min"]' },
          ],
        },
        {
          name: 'a mousedown on the trigger toggles only once',
          props: { label: 'Price' },
          children: onePanelNode,
          interactions: [
            { type: 'click', selector: trigger },
            { type: 'pointerdown', selector: trigger },
          ],
        },
      ],
    },
  ],
}
