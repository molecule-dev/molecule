/**
 * `@molecule/app-pagination-bar-react` cases: the page window, the
 * "Showing X to Y of Z" text, the optional page-size selector and every
 * callback they make.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Props every case starts from: page 1 of 3, 20 per page, 50 items. */
const base = { page: 1, totalPages: 3, pageSize: 20, total: 50 }

/** `@molecule/app-pagination-bar-react`. */
export const paginationBarFeature: FeatureCases = {
  package: '@molecule/app-pagination-bar-react',
  families: [
    {
      component: 'PaginationBar',
      cases: [
        {
          name: 'first page of three',
          props: base,
          callbacks: ['onPageChange'],
        },
        {
          name: 'middle page marks the current page',
          props: { ...base, page: 2 },
          callbacks: ['onPageChange'],
        },
        {
          name: 'last page disables Next',
          props: { ...base, page: 3 },
          callbacks: ['onPageChange'],
        },
        {
          name: 'a single page disables both arrows',
          props: { page: 1, totalPages: 1, pageSize: 20, total: 7 },
          callbacks: ['onPageChange'],
        },
        {
          name: 'no items',
          props: { page: 1, totalPages: 1, pageSize: 10, total: 0 },
          callbacks: ['onPageChange'],
        },
        {
          name: 'large totals are localized',
          props: { page: 1, totalPages: 100, pageSize: 10, total: 1000 },
          callbacks: ['onPageChange'],
        },
        {
          name: 'ellipsis on both sides',
          props: { page: 5, totalPages: 10, pageSize: 10, total: 100 },
          callbacks: ['onPageChange'],
        },
        {
          name: 'window near the start',
          props: { page: 1, totalPages: 10, pageSize: 10, total: 100 },
          callbacks: ['onPageChange'],
        },
        {
          name: 'window near the end',
          props: { page: 9, totalPages: 10, pageSize: 10, total: 100 },
          callbacks: ['onPageChange'],
        },
        {
          name: 'exactly five pages renders no ellipsis',
          props: { page: 3, totalPages: 5, pageSize: 10, total: 50 },
          callbacks: ['onPageChange'],
        },
        {
          name: 'six pages on the first page',
          props: { page: 1, totalPages: 6, pageSize: 10, total: 60 },
          callbacks: ['onPageChange'],
        },
        {
          name: 'Previous and Next change the page',
          props: { ...base, page: 2 },
          callbacks: ['onPageChange'],
          interactions: [
            { type: 'click', selector: 'button[aria-label="Previous page"]' },
            { type: 'click', selector: 'button[aria-label="Next page"]' },
          ],
        },
        {
          name: 'clicking a page number changes the page',
          props: base,
          callbacks: ['onPageChange'],
          interactions: [{ type: 'click', selector: 'div > div > button:nth-of-type(3)' }],
        },
        {
          name: 'the window follows a page prop change',
          props: base,
          callbacks: ['onPageChange'],
          interactions: [
            { type: 'props', props: { page: 2 } },
            { type: 'click', selector: 'button[aria-label="Next page"]' },
          ],
        },
        {
          name: 'page-size options with a selection',
          props: { ...base, pageSizeOptions: [10, 20, 50] },
          callbacks: ['onPageChange', 'onPageSizeChange'],
          interactions: [{ type: 'input', selector: 'select', value: '50' }],
        },
        {
          name: 'page-size options without onPageSizeChange render no selector',
          props: { ...base, pageSizeOptions: [10, 25] },
          callbacks: ['onPageChange'],
        },
        {
          name: 'onPageSizeChange without pageSizeOptions renders no selector',
          props: base,
          callbacks: ['onPageChange', 'onPageSizeChange'],
        },
        {
          name: 'custom showing key keeps its English default',
          props: {
            ...base,
            showingKey: 'orders.showing',
            showingDefault: 'Orders {{start}}–{{end}} of {{total}}',
          },
          callbacks: ['onPageChange'],
        },
        {
          name: 'custom showing key resolved from translations',
          props: { ...base, showingKey: 'orders.showing' },
          callbacks: ['onPageChange'],
          context: {
            translations: {
              en: { orders: { showing: 'Orders {{start}} to {{end}} ({{total}})' } },
            },
          },
        },
        {
          name: 'default showing key resolved from translations',
          props: base,
          callbacks: ['onPageChange'],
          context: {
            translations: {
              en: { pagination: { showing: 'Displaying {{start}}–{{end}} of {{total}}' } },
            },
          },
        },
        {
          name: 'className passthrough',
          props: { ...base, className: 'parity-token' },
          callbacks: ['onPageChange'],
        },
      ],
    },
  ],
}
