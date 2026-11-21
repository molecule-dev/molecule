/**
 * `@molecule/app-ticker-row-react` cases: the financial ticker row — symbol +
 * price + change% + optional icon/sparkline/meta.
 *
 * While `onClick` is set the whole row is clickable through a transparent
 * native button laid over it (`data-mol-id="ticker-row-open"`, named by the
 * symbol); the `meta` slot is raised above it, so a click on its content is
 * the slot's own and `onClick` is not called.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The row's open action: the transparent button React lays over the row while `onClick` is set. */
const openSelector = 'button[data-mol-id="ticker-row-open"]'

/** `@molecule/app-ticker-row-react`. */
export const tickerRowFeature: FeatureCases = {
  package: '@molecule/app-ticker-row-react',
  families: [
    {
      component: 'TickerRow',
      cases: [
        {
          name: 'symbol, name and price',
          props: { symbol: 'BTC', name: 'Bitcoin', price: '$67,000' },
        },
        { name: 'name omitted', props: { symbol: 'ETH', price: '$3,100' } },
        { name: 'positive change', props: { symbol: 'X', price: '$1', changePct: 3.21 } },
        { name: 'negative change', props: { symbol: 'X', price: '$1', changePct: -1.5 } },
        { name: 'zero change', props: { symbol: 'X', price: '$1', changePct: 0 } },
        {
          name: 'changeDisplay without changePct',
          props: { symbol: 'X', price: '$1', changeDisplay: '+$0.50' },
        },
        {
          name: 'changeDisplay overrides the formatted percentage',
          props: { symbol: 'X', price: '$1', changePct: 2, changeDisplay: '+$0.50' },
        },
        {
          name: 'icon, sparkline and meta slots',
          props: { symbol: 'X', price: '$1' },
          slots: {
            icon: [{ tag: 'span', attrs: { 'data-icon': '' } }],
            sparkline: [{ tag: 'svg', attrs: { 'data-spark': '' } }],
            meta: [{ tag: 'span', attrs: { 'data-meta': '' } }],
          },
        },
        {
          name: 'full row with className',
          props: {
            symbol: 'SOL',
            name: 'Solana',
            price: '$142.10',
            changePct: -0.75,
            className: 'parity-token',
          },
          slots: {
            icon: [{ tag: 'span', attrs: { 'data-icon': '' } }],
            sparkline: [{ tag: 'svg', attrs: { 'data-spark': '' } }],
            meta: [{ tag: 'span', attrs: { 'data-meta': '' }, children: ['$68B vol'] }],
          },
        },
        {
          name: 'clicking the open button calls onClick',
          props: { symbol: 'X', price: '$1' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: openSelector }],
        },
        {
          name: 'clicking an inner control does not call onClick',
          props: { symbol: 'X', price: '$1' },
          callbacks: ['onClick'],
          slots: {
            meta: [
              {
                tag: 'span',
                attrs: { 'data-meta': '', role: 'button', tabindex: '0' },
                children: ['$68B vol'],
              },
            ],
          },
          interactions: [{ type: 'click', selector: '[data-meta]' }],
        },
        {
          name: 'change changePct flips arrow and color',
          props: { symbol: 'X', price: '$1', changePct: 3.21 },
          interactions: [{ type: 'props', props: { changePct: -1.5 } }],
        },
        {
          name: 'changeDisplay appears on a later render',
          props: { symbol: 'X', price: '$1', changePct: 2 },
          interactions: [{ type: 'props', props: { changeDisplay: '+$0.50' } }],
        },
      ],
    },
  ],
}
