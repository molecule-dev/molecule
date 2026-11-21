/**
 * `@molecule/app-search-ui-react` cases: a search field with a shortcut cap,
 * tips tooltip, clear button, filter chips and hit count (`SearchBox`), a
 * ranked results list with the matched terms marked (`SearchResults`), the
 * `mod+k` dialog that wraps both (`QuickSearchDialog`), and the two small
 * pieces they render (`Highlight`, `Kbd`).
 *
 * The sessions the dialog cases take are plain objects with the session's
 * shape — every framework's dialog reads the same fields, unwrapping the
 * reactive containers its own client-search binding uses.
 *
 * The list's rows are keyed by the hit's `id` value and the chips by React's
 * composite key, so the derived keyed-list cases pin DOM reuse on a re-passed
 * and a reordered array.
 *
 * @module
 */

import type { UICase } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** A document the result cases render. */
interface Doc {
  name: string
  d: string
  /** The row's small facts (type, category), which the caller owns and translates. */
  meta: string[]
}

/** The two documents the results list renders. */
const DOCS: Doc[] = [
  { name: 'api-auth', d: 'Sign in and sessions', meta: ['core', 'auth'] },
  { name: 'app-auth', d: 'Client auth', meta: ['core', 'auth'] },
]

/**
 * How a hit renders: a package link with a marked title, a meta line, a
 * two-line description and opaque router state. The meta facts come from the
 * caller's own document, as they do in an app, so the case declares them (the
 * pseudo-locale check treats a case's strings as the caller's, never as the
 * component's English).
 *
 * @param doc - The hit's document.
 * @returns The row's view.
 */
const view = (doc: Doc): Record<string, unknown> => ({
  href: `/packages/${doc.name}`,
  title: doc.name,
  description: doc.d,
  meta: doc.meta,
  mono: true,
  state: { pkg: doc.name },
})

/** The two hits the results list renders, both matched on `auth`. */
const HITS = [
  { id: 'a', doc: DOCS[0], terms: ['auth'] },
  { id: 'b', doc: DOCS[1], terms: ['auth'], related: true },
]

/**
 * The right inset every field and list case carries.
 *
 * `SearchBox`'s field and `SearchResults`' list are the only full-bleed rounded
 * boxes in the package, so their 1px border ends on the page's final pixel
 * column, where Chromium's `fullPage` capture is nondeterministic by one value
 * out of 255 in the antialiased corner: two shots of the *same* page differ
 * there, so React's own page fails against itself (measured 12–20 of the 87
 * pages on each run). Keeping the border off that column makes the capture
 * repeatable; React and every port render the same DOM with the same class
 * either way, so the comparison itself is unchanged.
 */
const EDGE_INSET = 'max-w-[calc(100%_-_4px)]'

/** The `View` a plain search session holds while something is typed. */
const typedParsed = {
  raw: 'category:auth oauth',
  text: 'oauth',
  phrases: [],
  exclude: [],
  filters: [{ field: 'category', values: ['auth'] }],
}

/** The `View` an idle session holds before anything is typed. */
const idleParsed = { raw: '', text: '', phrases: [], exclude: [], filters: [] }

/**
 * A plain search session with one hit for `auth`, in the shape every
 * framework's dialog reads. The functions are inert: what they return is
 * invisible (their calls are the session's own, not a callback prop), and the
 * text they would change stays at `query`.
 *
 * @returns The session.
 */
const typedSession = (): Record<string, unknown> => ({
  inputRef: { current: null },
  query: 'auth',
  setQuery: { $fn: 'setQuery' },
  clear: { $fn: 'clear' },
  parsed: typedParsed,
  hits: [{ id: 'a', doc: { name: 'api-auth' }, terms: ['auth'], fields: ['name'], score: 1 }],
  active: true,
  ranked: true,
  activeIndex: 0,
  setActiveIndex: { $fn: 'setActiveIndex' },
  onKeyDown: { $fn: 'onKeyDown' },
  removeFilter: { $fn: 'removeFilter' },
  open: { $fn: 'open' },
  prefetch: { $fn: 'prefetch' },
  focus: { $fn: 'focus' },
})

/**
 * An idle session: nothing typed, so the pane shows `idleText` rather than a
 * browse list.
 *
 * @returns The session.
 */
const idleSession = (): Record<string, unknown> => ({
  ...typedSession(),
  query: '',
  parsed: idleParsed,
  hits: [],
  active: false,
  ranked: false,
  activeIndex: -1,
})

/** `Kbd`: a key cap. */
const kbdCases: UICase[] = [
  {
    name: 'a key label',
    children: ['↵'],
  },
  {
    name: 'a class and a node child',
    props: { className: 'parity-kbd' },
    children: [{ tag: 'span', attrs: { 'data-key': 'esc' }, children: ['esc'] }],
  },
]

/** `Highlight`: text with the matched terms marked. */
const highlightCases: UICase[] = [
  {
    name: 'marks each term at a word start, case-insensitively',
    props: { text: 'User feedback and Feedback loops', terms: ['feedback'] },
  },
  {
    name: 'mid-word, empty and no terms mark nothing, then a word-start term marks',
    props: { text: 'authentication required', terms: ['thent'] },
    interactions: [
      { type: 'props', props: { terms: [] } },
      { type: 'props', props: { terms: ['required'] } },
      { type: 'props', props: { text: '', terms: ['required'] } },
    ],
  },
  {
    name: 'two terms mark two words',
    props: { text: 'Sign in and sessions', terms: ['sign', 'sessions'] },
  },
]

/** `SearchBox`: the field, its cap, tips, clear and chips, and the status row. */
const searchBoxCases: UICase[] = [
  {
    name: 'the empty field shows the cap, the help icon and the tips, with a label',
    props: {
      value: '',
      placeholder: 'Search packages',
      label: 'Find a package',
      examples: ['category:auth'],
      molId: 'cat',
      className: EDGE_INSET,
    },
    slots: {
      afterField: [{ tag: 'nav', attrs: { 'data-mol-id': 'cat-tabs' }, children: ['All'] }],
    },
    callbacks: ['onChange'],
    interactions: [
      { type: 'focus', selector: '[data-mol-id="cat-input"]' },
      { type: 'blur', selector: '[data-mol-id="cat-input"]' },
    ],
  },
  {
    name: 'typing hides the cap and shows the count, a chip, the clear button and the tips',
    props: {
      value: 'category:auth oauth',
      count: 7,
      filters: [{ field: 'category', values: ['auth'] }],
      placeholder: 'Search packages',
      examples: ['category:auth'],
      molId: 'cat',
      className: EDGE_INSET,
    },
    slots: {
      afterField: [{ tag: 'nav', attrs: { 'data-mol-id': 'cat-tabs' }, children: ['All'] }],
    },
    callbacks: ['onChange', 'onKeyDown', 'onRemoveFilter', 'onClear'],
    interactions: [
      { type: 'input', selector: '[data-mol-id="cat-input"]', value: 'category:auth oauth extra' },
      { type: 'keydown', selector: '[data-mol-id="cat-input"]', key: 'Enter', keyCode: 13 },
      { type: 'click', selector: '[data-mol-id="cat-filter"]' },
      { type: 'click', selector: '[data-mol-id="cat-clear"]' },
    ],
  },
  {
    name: 'the count shows only while the text is not blank',
    props: {
      value: '',
      count: 3,
      placeholder: 'Search packages',
      molId: 'cat',
      className: EDGE_INSET,
    },
    callbacks: ['onChange'],
    interactions: [{ type: 'props', props: { value: 'oauth' } }],
  },
  {
    name: 'the clear button appears with text and refocuses the input through the ref',
    props: {
      value: '',
      inputRef: { current: null },
      placeholder: 'Search packages',
      molId: 'cat',
      className: EDGE_INSET,
    },
    callbacks: ['onClear'],
    interactions: [
      { type: 'props', props: { value: 'auth' } },
      { type: 'click', selector: '[data-mol-id="cat-clear"]' },
      { type: 'props', props: { value: '' } },
    ],
  },
  {
    name: 'a negated chip among two, with a custom shortcut',
    props: {
      value: '',
      filters: [
        { field: 'category', values: ['docs'], negate: true },
        { field: 'type', values: ['core'] },
      ],
      shortcut: '⌘K',
      placeholder: 'Search packages',
      molId: 'q',
      className: EDGE_INSET,
    },
    callbacks: ['onRemoveFilter'],
    interactions: [{ type: 'click', selector: '[data-mol-id="q-filter"]' }],
  },
  {
    name: 'a null shortcut and a hidden cap while focused',
    props: {
      value: '',
      shortcut: null,
      placeholder: 'Search packages',
      molId: 'cat',
      className: EDGE_INSET,
    },
    callbacks: ['onChange'],
    interactions: [
      { type: 'focus', selector: '[data-mol-id="cat-input"]' },
      { type: 'props', props: { value: 'oauth' } },
    ],
  },
  {
    name: 'autoFocus focuses the input through the ref on mount',
    props: {
      value: '',
      placeholder: 'Search packages',
      autoFocus: true,
      inputRef: { current: null },
      molId: 'cat',
      className: EDGE_INSET,
    },
    interactions: [{ type: 'props', props: { autoFocus: false } }],
  },
]

/** `SearchResults`: the ranked rows with their marks, active row and actions. */
const searchResultsCases: UICase[] = [
  {
    name: 'marks matches, flags the active and related rows, and opens on a plain click',
    props: {
      hits: HITS,
      view,
      activeIndex: 1,
      emptyText: 'Nothing',
      className: `parity-list ${EDGE_INSET}`,
      molId: 'cat',
    },
    callbacks: ['onOpen', 'onActivate', 'onPrefetch'],
    interactions: [
      { type: 'event', selector: '[data-mol-id="cat-hit"]', event: 'pointerover', bubbles: true },
      { type: 'click', selector: '[data-mol-id="cat-hit"] a' },
      { type: 'click', selector: '[data-mol-id="cat-hit"] a', modifiers: { metaKey: true } },
      { type: 'props', props: { activeIndex: 0 } },
    ],
  },
  {
    name: 'a bare view and a focus or a touch warm the row',
    props: {
      hits: HITS,
      view: (doc: Doc): Record<string, unknown> => ({
        href: `/packages/${doc.name}`,
        title: doc.name,
      }),
      activeIndex: -1,
      emptyText: 'Nothing',
      molId: 'hit',
      className: EDGE_INSET,
    },
    callbacks: ['onOpen', 'onPrefetch'],
    interactions: [
      { type: 'focus', selector: '[data-mol-id="hit-hit"] a' },
      { type: 'event', selector: '[data-mol-id="hit-hit"]', event: 'touchstart', bubbles: true },
    ],
  },
  {
    name: 'an empty list shows the empty text, then the rows',
    props: {
      hits: [],
      view,
      activeIndex: -1,
      emptyText: 'Nothing',
      molId: 'cat',
      className: EDGE_INSET,
    },
    callbacks: ['onOpen'],
    interactions: [{ type: 'props', props: { hits: HITS } }],
  },
  {
    name: 'a custom link replaces the row body and lets its default through',
    props: {
      hits: HITS,
      view,
      activeIndex: -1,
      emptyText: 'Nothing',
      className: EDGE_INSET,
      renderLink: {
        $fn: 'renderLink',
        nodes: [{ tag: 'b', attrs: { 'data-custom-link': '{0.href}' }, children: ['go'] }],
      },
    },
    callbacks: ['onOpen'],
    interactions: [{ type: 'click', selector: '[data-custom-link]' }],
  },
  {
    name: 'an action renders at the row end with the document',
    props: {
      hits: HITS,
      view,
      activeIndex: -1,
      emptyText: 'Nothing',
      className: EDGE_INSET,
      action: {
        $fn: 'action',
        nodes: [
          {
            tag: 'button',
            attrs: { type: 'button', 'data-action': '{0.name}' },
            children: ['Pin'],
          },
        ],
      },
    },
    callbacks: ['onOpen'],
  },
]

/** `QuickSearchDialog`: the `mod+k` dialog around the box and the list. */
const quickSearchDialogCases: UICase[] = [
  {
    name: 'closed it renders nothing',
    props: {
      open: false,
      session: typedSession(),
      view,
      placeholder: 'Search packages',
      emptyText: 'Nothing',
      molId: 'qs',
    },
    callbacks: ['onClose'],
  },
  {
    name: 'open it focuses the field, shows the count and one hit, and closes on a prop change',
    props: {
      open: true,
      session: typedSession(),
      view,
      placeholder: 'Search packages',
      examples: ['category:auth'],
      idleText: 'Type to search',
      emptyText: 'Nothing',
      molId: 'qs',
    },
    callbacks: ['onClose'],
    interactions: [{ type: 'props', props: { open: false } }],
  },
  {
    name: 'an idle session shows the idle text instead of hits',
    props: {
      open: true,
      session: idleSession(),
      view,
      placeholder: 'Search packages',
      idleText: 'Type to search',
      emptyText: 'Nothing',
      molId: 'qs',
    },
    callbacks: ['onClose'],
    interactions: [{ type: 'props', props: { idleText: undefined } }],
  },
  {
    name: 'a closed dialog opens on a props change and focuses the field',
    props: {
      open: false,
      session: typedSession(),
      view,
      placeholder: 'Search packages',
      emptyText: 'Nothing',
      molId: 'qs',
    },
    callbacks: ['onClose'],
    interactions: [{ type: 'props', props: { open: true } }],
  },
]

/** `@molecule/app-search-ui-react`. */
export const searchUiFeature: FeatureCases = {
  package: '@molecule/app-search-ui-react',
  families: [
    { component: 'Highlight', cases: highlightCases },
    { component: 'Kbd', cases: kbdCases },
    {
      component: 'QuickSearchDialog',
      cases: quickSearchDialogCases,
    },
    {
      component: 'SearchBox',
      cases: searchBoxCases,
      keyedLists: [
        {
          prop: 'filters',
          selector: '[data-mol-id="q-filter"]',
          caseName: 'a negated chip among two, with a custom shortcut',
        },
      ],
    },
    {
      component: 'SearchResults',
      cases: searchResultsCases,
      keyedLists: [
        {
          prop: 'hits',
          selector: '[data-mol-id="cat-hit"]',
          caseName: 'marks matches, flags the active and related rows, and opens on a plain click',
        },
      ],
    },
  ],
}
