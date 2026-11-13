/**
 * Pagination parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** Pagination: page windows with ellipses, siblings/boundaries, nav buttons, labels, sizes, onChange. */
export const paginationCases: UIComponentCases = {
  component: 'Pagination',
  cases: [
    { name: 'defaults (first page)', props: { page: 1, totalPages: 10 }, callbacks: ['onChange'] },
    {
      name: 'middle page with ellipses on both sides',
      props: { page: 5, totalPages: 10 },
      callbacks: ['onChange'],
    },
    { name: 'last page', props: { page: 10, totalPages: 10 }, callbacks: ['onChange'] },
    { name: 'single page', props: { page: 1, totalPages: 1 }, callbacks: ['onChange'] },
    {
      name: 'short range without ellipses',
      props: { page: 2, totalPages: 4 },
      callbacks: ['onChange'],
    },
    {
      name: 'siblings 2',
      props: { page: 6, totalPages: 12, siblings: 2 },
      callbacks: ['onChange'],
    },
    {
      name: 'boundaries 2',
      props: { page: 5, totalPages: 10, boundaries: 2 },
      callbacks: ['onChange'],
    },
    {
      name: 'showFirstLast',
      props: { page: 5, totalPages: 10, showFirstLast: true },
      callbacks: ['onChange'],
    },
    {
      name: 'showPrevNext false',
      props: { page: 5, totalPages: 10, showPrevNext: false },
      callbacks: ['onChange'],
    },
    {
      name: 'page numbers only',
      props: { page: 5, totalPages: 10, showFirstLast: true, showPrevNext: false },
      callbacks: ['onChange'],
    },
    ...(['xs', 'sm', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      props: { page: 2, totalPages: 5, size },
      callbacks: ['onChange'],
    })),
    {
      name: 'custom labels',
      props: {
        page: 2,
        totalPages: 4,
        showFirstLast: true,
        labels: {
          nav: 'Seiten',
          first: 'Erste Seite',
          previous: 'Zurück',
          next: 'Weiter',
          last: 'Letzte Seite',
        },
      },
      callbacks: ['onChange'],
    },
    {
      name: 'partial labels fall back per control',
      props: { page: 2, totalPages: 4, labels: { nav: 'Pages' } },
      callbacks: ['onChange'],
    },
    {
      name: 'disabled',
      props: { page: 2, totalPages: 5, disabled: true },
      callbacks: ['onChange'],
    },
    {
      name: 'className, style and testId',
      props: {
        page: 2,
        totalPages: 5,
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'pager',
      },
      callbacks: ['onChange'],
    },
    {
      name: 'clicking a page calls onChange',
      props: { page: 1, totalPages: 10 },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: '[aria-label="Go to page 2"]' }],
    },
    {
      name: 'next calls onChange',
      props: { page: 1, totalPages: 10 },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: '[aria-label="Go to next page"]' }],
    },
    {
      name: 'previous calls onChange',
      props: { page: 5, totalPages: 10 },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: '[aria-label="Go to previous page"]' }],
    },
    {
      name: 'first and last call onChange',
      props: { page: 5, totalPages: 10, showFirstLast: true },
      callbacks: ['onChange'],
      interactions: [
        { type: 'click', selector: '[aria-label="Go to first page"]' },
        { type: 'click', selector: '[aria-label="Go to last page"]' },
      ],
    },
    {
      name: 'previous is disabled on the first page',
      props: { page: 1, totalPages: 10 },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: '[aria-label="Go to previous page"]' }],
    },
    {
      name: 'next is disabled on the last page',
      props: { page: 10, totalPages: 10 },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: '[aria-label="Go to next page"]' }],
    },
    {
      name: 'clicking the current page does not call onChange',
      props: { page: 5, totalPages: 10 },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: '[aria-label="Go to page 5"]' }],
    },
    {
      name: 'disabled ignores page clicks',
      props: { page: 1, totalPages: 10, disabled: true },
      callbacks: ['onChange'],
      interactions: [{ type: 'click', selector: '[aria-label="Go to page 2"]' }],
    },
    {
      name: 'goToPage label function',
      props: {
        page: 2,
        totalPages: 4,
        labels: { goToPage: { $fn: 'goToPage', format: 'Seite {0} von 4' } },
      },
      callbacks: ['onChange'],
    },
    {
      name: 'goToPage label function with mixed labels',
      props: {
        page: 2,
        totalPages: 4,
        showFirstLast: true,
        labels: {
          nav: 'Seiten',
          goToPage: { $fn: 'goToPage', format: 'Öffne Seite {0}' },
        },
      },
      callbacks: ['onChange'],
    },
  ],
}
