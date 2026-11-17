/**
 * `QuickPicker` cases: the quick-open / command-palette overlay's every state —
 * the rows with their details and icon nodes, the placeholder, the seeded and
 * typed query with its fuzzy filter and score order, the empty and loading
 * states, the keyboard and pointer navigation with its clamps, every callback,
 * the highlight reset when the items arrive anew, and the theme, viewport and
 * locale branches.
 *
 * The picker is PRESENTATIONAL: its items and loading flag arrive as props, so
 * the loading state is moved forward with a `props` step exactly the way the
 * host would.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The items most cases share: three commands, one with a detail line. */
const ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'settings', label: 'Settings', detail: 'Open preferences' },
]

/** `QuickPicker`. */
export const quickPickerCases: FeatureComponentCases = {
  component: 'QuickPicker',
  keyedLists: [
    {
      prop: 'items',
      selector: '[data-mol-id^="quick-picker-item-"]',
      caseName: 'rows with details and an icon node',
    },
  ],
  cases: [
    // ── The empty overlay ───────────────────────────────────────────────────
    {
      name: 'no items',
      props: { items: [] },
      callbacks: ['onSelect', 'onDismiss'],
    },
    {
      name: 'rows with details and an icon node',
      props: {
        items: [
          { id: 'home', label: 'Home' },
          {
            id: 'docs',
            label: 'Documentation',
            detail: ' Guides ',
            icon: { $nodes: [{ tag: 'i', attrs: { 'data-icon': 'book' } }] },
          },
          { id: 'settings', label: 'Settings', detail: 'Open preferences' },
        ],
      },
      callbacks: ['onSelect', 'onDismiss'],
    },
    {
      name: 'the placeholder prop replaces the default',
      props: { items: [] },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [{ type: 'props', props: { placeholder: 'Go to file…' } }],
    },
    {
      name: 'the className lands on the panel',
      props: { items: [] },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [{ type: 'props', props: { className: 'parity-token' } }],
    },

    // ── The query ───────────────────────────────────────────────────────────
    {
      name: 'an initial query opens the picker filtered and highlights the top match',
      props: { items: ITEMS, initialQuery: 'se' },
      callbacks: ['onSelect', 'onDismiss'],
    },
    {
      name: 'typing filters and sorts by fuzzy score',
      props: {
        items: [
          { id: 'home', label: 'Home' },
          { id: 'guide', label: 'How to make eggs' },
          { id: 'zebra', label: 'Zebra' },
        ],
      },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [{ type: 'input', selector: 'input[type="text"]', value: 'hme' }],
    },
    {
      name: 'a whitespace-only query shows every row',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [{ type: 'input', selector: 'input[type="text"]', value: '   ' }],
    },
    {
      name: 'a query that matches nothing says so',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [{ type: 'input', selector: 'input[type="text"]', value: 'zzzz' }],
    },
    {
      name: 'clearing the query brings every row back',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [
        { type: 'input', selector: 'input[type="text"]', value: 'se' },
        { type: 'input', selector: 'input[type="text"]', value: '' },
      ],
    },
    {
      name: 'a later initialQuery prop never reseeds the input',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [
        { type: 'input', selector: 'input[type="text"]', value: 'ho' },
        { type: 'props', props: { initialQuery: 'se' } },
      ],
    },

    // ── The loading state ───────────────────────────────────────────────────
    {
      name: 'loading says so instead of a list',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [{ type: 'props', props: { loading: true } }],
    },
    {
      name: 'the rows appear once loading ends',
      props: { items: ITEMS, loading: true },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [{ type: 'props', props: { loading: false } }],
    },

    // ── Keyboard and pointer navigation ─────────────────────────────────────
    {
      name: 'arrow keys move the highlight and clamp at the ends',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowDown' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowDown' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowDown' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowDown' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowUp' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowUp' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowUp' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowUp' },
      ],
    },
    {
      name: 'Enter selects the highlighted row',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowDown' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'Enter' },
      ],
    },
    {
      name: 'Enter after typing selects the top match',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [
        { type: 'input', selector: 'input[type="text"]', value: 'ho' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'Enter' },
      ],
    },
    {
      name: 'Enter with no rows at all does nothing',
      props: { items: [] },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [{ type: 'keydown', selector: 'input[type="text"]', key: 'Enter' }],
    },
    {
      name: 'Escape dismisses the picker',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [{ type: 'keydown', selector: 'input[type="text"]', key: 'Escape' }],
    },
    {
      name: 'clicking the backdrop dismisses the picker',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [{ type: 'click', selector: 'body > div > div > div:nth-child(1)' }],
    },
    {
      name: 'clicking a row selects it',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [{ type: 'click', selector: '[data-mol-id="quick-picker-item-settings"]' }],
    },
    {
      name: 'hovering a row moves the highlight to it',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [
        { type: 'mouseenter', selector: '[data-mol-id="quick-picker-item-about"]' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'Enter' },
      ],
    },

    // ── New items ───────────────────────────────────────────────────────────
    {
      name: 'replaced items reset the highlight to the first row',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowDown' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowDown' },
        {
          type: 'props',
          props: {
            items: [
              { id: 'terminal', label: 'Terminal', detail: 'New' },
              { id: 'deploy', label: 'Deploy site' },
            ],
          },
        },
      ],
    },
    // The carried-over index STAYS INSIDE the replacement's range here (two
    // rows down, four new items), so the reset is visible: the first snapshot
    // after the replacement must highlight row 0, never the old index — the
    // reset lands in the same render that replaced the rows.
    {
      name: 'replaced items reset the highlight even when the old index is still in range',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      interactions: [
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowDown' },
        { type: 'keydown', selector: 'input[type="text"]', key: 'ArrowDown' },
        {
          type: 'props',
          props: {
            items: [
              { id: 'files', label: 'Open Files' },
              { id: 'search', label: 'Search', detail: 'New' },
              { id: 'git', label: 'Source Control' },
              { id: 'help', label: 'Help' },
            ],
          },
        },
      ],
    },

    // ── Theme, viewport, pointer, locale ────────────────────────────────────
    {
      name: 'the dark theme tints the panel and the selected row',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      context: { theme: 'dark' },
    },
    {
      name: 'a narrow viewport anchors the picker near the top of the screen',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      viewportWidth: 390,
    },
    {
      name: 'a coarse pointer enlarges the input text',
      props: { items: ITEMS },
      callbacks: ['onSelect', 'onDismiss'],
      pointer: 'coarse',
    },
    {
      name: 'a locale switch re-renders the loading, empty and placeholder labels',
      props: { items: [], loading: true },
      callbacks: ['onSelect', 'onDismiss'],
      context: {
        locale: 'en',
        translations: {
          en: {
            ide: {
              quickPicker: {
                placeholder: 'Type to search…',
                loading: 'Loading…',
                noResults: 'No matching results',
              },
            },
          },
          fr: {
            ide: {
              quickPicker: {
                placeholder: 'Tapez pour rechercher…',
                loading: 'Chargement…',
                noResults: 'Aucun résultat',
              },
            },
          },
        },
      },
      interactions: [
        { type: 'locale', locale: 'fr' },
        { type: 'props', props: { loading: false } },
      ],
    },
  ],
}
