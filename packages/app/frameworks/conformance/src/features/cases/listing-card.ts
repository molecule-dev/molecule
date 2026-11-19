/**
 * `@molecule/app-listing-card-react` cases: the listing card shell and its
 * media / body / actions / grid parts, in every prop branch.
 *
 * The five components have no i18n, router or service dependency, so every
 * case mounts on the UI providers alone. `ListingCard` is the only one with
 * callbacks: `onClick`, on the whole card (a click inside the actions row
 * bubbles into it, and its presence alone makes the card cursor-pointer), and
 * its `toggle`'s `commit` / `onError` (a toggle click updates at once, is
 * busy while the save runs, and never reaches `onClick`); and
 * `ListingCardMedia` is the only one that swaps a caller node for its own
 * `<img>` fallback.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Two cards inside a grid. */
const cards = [
  { tag: 'div', attrs: { 'data-card': 'a' }, children: ['A'] },
  { tag: 'div', attrs: { 'data-card': 'b' }, children: ['B'] },
]

/** A node-valued title (`ListingCardBody.title` is a `ReactNode`). */
const titleNode = [{ tag: 'strong', attrs: { 'data-title': '' }, children: ['Sea view'] }]
/** A node-valued subtitle / price / meta, the way callers pass rich content. */
const subtitleNode = [{ tag: 'em', attrs: { 'data-subtitle': '' }, children: ['Downtown'] }]
const priceNode = [{ tag: 'span', attrs: { 'data-price': '' }, children: ['$120'] }]
const metaNode = [{ tag: 'span', attrs: { 'data-meta': '' }, children: ['4.9 ★'] }]
/** A custom media node (React renders it instead of the `<img>`). */
const mediaNode = [{ tag: 'video', attrs: { 'data-video': '' } }]
/** The overlay node, absolutely positioned over the media. */
const overlayNode = [{ tag: 'span', attrs: { 'data-overlay': '' }, children: ['New'] }]

/** A counted toggle: not pressed, three people so far. */
const toggle = {
  value: { pressed: false, count: 3 },
  commit: { $callback: 'commit' },
  activeLabel: 'Saved',
  inactiveLabel: 'Save',
}

/** `@molecule/app-listing-card-react`. */
export const listingCardFeature: FeatureCases = {
  package: '@molecule/app-listing-card-react',
  families: [
    {
      component: 'ListingCard',
      cases: [
        {
          name: 'children inside the stack',
          children: [{ tag: 'div', attrs: { 'data-slot': '' }, children: ['Body'] }],
        },
        { name: 'text children', children: ['Plain text'] },
        {
          name: 'data-mol-id and className passthrough',
          props: { dataMolId: 'card-x', className: 'parity-token' },
          children: ['x'],
        },
        {
          name: 'no onClick leaves the card plain',
          props: { dataMolId: 'card-x' },
          children: ['x'],
        },
        {
          name: 'onClick marks the card clickable',
          // The handler is a callback prop (not a `callbacks` entry), so a
          // later `props` step can take it away again.
          props: { dataMolId: 'card-x', onClick: { $callback: 'onClick' } },
          children: [{ tag: 'div', attrs: { 'data-inner': '' }, children: ['x'] }],
        },
        {
          name: 'a counted toggle after the content',
          props: { toggle },
          children: ['x'],
        },
        {
          name: 'a pressed toggle with its own data-mol-id',
          props: { toggle: { ...toggle, value: { pressed: true, count: 4 }, dataMolId: 'like' } },
          children: ['x'],
        },
        {
          name: 'a toggle click shows the desired count while the save runs, without calling onClick',
          props: { onClick: { $callback: 'onClick' }, toggle },
          callbackResults: { commit: { defer: true } },
          children: ['x'],
          interactions: [
            { type: 'click', selector: 'button' },
            { type: 'settle', callback: 'commit', value: { pressed: true, count: 10 } },
          ],
        },
        {
          name: 'a failed toggle save restores the confirmed state and reports the error',
          props: { toggle: { ...toggle, onError: { $callback: 'onError' } } },
          callbackResults: { commit: { defer: true } },
          children: ['x'],
          interactions: [
            { type: 'click', selector: 'button' },
            { type: 'settle', callback: 'commit', error: 'offline' },
          ],
        },
        {
          name: 'a click anywhere on the card calls onClick',
          props: { onClick: { $callback: 'onClick' } },
          children: [{ tag: 'div', attrs: { 'data-inner': '' }, children: ['x'] }],
          interactions: [{ type: 'click', selector: '[data-inner]' }],
        },
        {
          name: 'a click on an action button bubbles into onClick',
          props: { onClick: { $callback: 'onClick' } },
          children: [
            {
              tag: 'button',
              attrs: { type: 'button', 'data-action': '' },
              children: ['Save'],
            },
          ],
          interactions: [{ type: 'click', selector: 'button[data-action]' }],
        },
        {
          name: 'removing onClick unmarks the card',
          props: { onClick: { $callback: 'onClick' } },
          children: ['x'],
          interactions: [{ type: 'props', props: { onClick: undefined } }],
        },
        {
          name: 'className change',
          props: { className: 'parity-token' },
          children: ['x'],
          interactions: [{ type: 'props', props: { className: 'other-token' } }],
        },
        {
          name: 'className removed',
          props: { className: 'parity-token' },
          children: ['x'],
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
        {
          name: 'data-mol-id change',
          props: { dataMolId: 'card-x' },
          children: ['x'],
          interactions: [{ type: 'props', props: { dataMolId: 'card-y' } }],
        },
      ],
    },
    {
      component: 'ListingCardMedia',
      cases: [
        { name: 'src and alt render an image', props: { src: 'pic.png', alt: 'a photo' } },
        { name: 'alt defaults to an empty string', props: { src: 'pic.png' } },
        { name: 'empty src renders no image', props: { src: '' } },
        { name: 'no props renders an empty box', props: {} },
        {
          name: 'children replace the image',
          props: { src: 'pic.png', alt: 'a photo' },
          children: mediaNode,
        },
        { name: 'text children replace the image', props: { src: 'pic.png' }, children: ['x'] },
        {
          name: 'the overlay node renders over the media',
          props: { src: 'pic.png' },
          slots: { overlay: overlayNode },
        },
        {
          name: 'children and overlay together',
          props: { src: 'pic.png' },
          children: mediaNode,
          slots: { overlay: overlayNode },
        },
        { name: 'aspect 1/1', props: { src: 'pic.png', aspect: '1/1' } },
        { name: 'aspect 4/3', props: { src: 'pic.png', aspect: '4/3' } },
        { name: 'aspect 16/9', props: { src: 'pic.png', aspect: '16/9' } },
        { name: 'aspect 3/2', props: { src: 'pic.png', aspect: '3/2' } },
        {
          name: 'className passthrough',
          props: { src: 'pic.png', className: 'parity-token' },
        },
        {
          name: 'aspect change',
          props: { src: 'pic.png', aspect: '4/3' },
          interactions: [{ type: 'props', props: { aspect: '16/9' } }],
        },
        {
          name: 'src removed',
          props: { src: 'pic.png' },
          interactions: [{ type: 'props', props: { src: undefined } }],
        },
        {
          name: 'src added later',
          props: {},
          interactions: [{ type: 'props', props: { src: 'later.png', alt: 'later' } }],
        },
        {
          name: 'overlay added later',
          props: { src: 'pic.png' },
          interactions: [
            {
              type: 'props',
              props: {
                overlay: {
                  $nodes: [{ tag: 'span', attrs: { 'data-late': '' }, children: ['Later'] }],
                },
              },
            },
          ],
        },
        {
          name: 'className change',
          props: { src: 'pic.png', className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'other-token' } }],
        },
      ],
    },
    {
      component: 'ListingCardBody',
      cases: [
        { name: 'title only', props: { title: 'Widget' } },
        { name: 'title as a node', slots: { title: titleNode } },
        { name: 'subtitle', props: { title: 'Widget', subtitle: 'Downtown' } },
        {
          name: 'subtitle as a node',
          props: { title: 'Widget' },
          slots: { subtitle: subtitleNode },
        },
        { name: 'price', props: { title: 'Widget', price: '$120' } },
        { name: 'price as a node', props: { title: 'Widget' }, slots: { price: priceNode } },
        { name: 'meta row', props: { title: 'Widget' }, slots: { meta: metaNode } },
        {
          name: 'every row',
          props: {
            title: 'Widget',
            subtitle: 'Downtown',
            price: '$120',
            className: 'parity-token',
          },
          slots: { meta: metaNode },
        },
        {
          name: 'className passthrough',
          props: { title: 'Widget', className: 'parity-token' },
        },
        {
          name: 'subtitle added later',
          props: { title: 'Widget' },
          interactions: [{ type: 'props', props: { subtitle: 'Later' } }],
        },
        {
          name: 'subtitle removed',
          props: { title: 'Widget', subtitle: 'Downtown' },
          interactions: [{ type: 'props', props: { subtitle: undefined } }],
        },
        {
          name: 'price added and removed',
          props: { title: 'Widget' },
          interactions: [
            { type: 'props', props: { price: '$9' } },
            { type: 'props', props: { price: undefined } },
          ],
        },
        {
          name: 'title change',
          props: { title: 'Widget' },
          interactions: [{ type: 'props', props: { title: 'Gadget' } }],
        },
        {
          name: 'className change',
          props: { title: 'Widget', className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'other-token' } }],
        },
      ],
    },
    {
      component: 'ListingCardActions',
      cases: [
        {
          name: 'renders its children',
          children: [{ tag: 'button', attrs: { type: 'button', 'data-a': '' }, children: ['Buy'] }],
        },
        { name: 'text children', children: ['x'] },
        { name: 'horizontal layout by default', props: {}, children: ['x'] },
        { name: 'stacked layout', props: { layout: 'stacked' }, children: ['x'] },
        { name: 'className passthrough', props: { className: 'parity-token' }, children: ['x'] },
        {
          name: 'layout change',
          props: { layout: 'horizontal' },
          children: ['x'],
          interactions: [{ type: 'props', props: { layout: 'stacked' } }],
        },
        {
          name: 'layout removed',
          props: { layout: 'stacked' },
          children: ['x'],
          interactions: [{ type: 'props', props: { layout: undefined } }],
        },
        {
          name: 'className change',
          props: { className: 'parity-token' },
          children: ['x'],
          interactions: [{ type: 'props', props: { className: 'other-token' } }],
        },
      ],
    },
    {
      component: 'ListingGrid',
      cases: [
        { name: 'renders its children', children: cards },
        { name: 'text child', children: ['Plain text'] },
        { name: 'no children', props: {} },
        { name: 'one column', props: { columns: 1 }, children: cards },
        { name: 'two columns', props: { columns: 2 }, children: cards },
        { name: 'four columns', props: { columns: 4 }, children: cards },
        { name: 'five columns', props: { columns: 5 }, children: cards },
        { name: 'six columns', props: { columns: 6 }, children: cards },
        { name: 'xs gap', props: { gap: 'xs' }, children: cards },
        { name: 'sm gap', props: { gap: 'sm' }, children: cards },
        { name: 'lg gap', props: { gap: 'lg' }, children: cards },
        { name: 'className passthrough', props: { className: 'parity-token' }, children: cards },
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
          name: 'className removed',
          props: { className: 'parity-token' },
          children: cards,
          interactions: [{ type: 'props', props: { className: undefined } }],
        },
      ],
    },
  ],
}
