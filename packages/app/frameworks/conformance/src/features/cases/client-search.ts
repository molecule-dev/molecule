/**
 * `@molecule/app-client-search-react` cases: the hooks that index a list
 * (`useClientSearchIndex`), keep an input's text and its hits
 * (`useClientSearch`), load a fuller document set in the background
 * (`useLazyDocs`), move a highlight through results (`useListNavigation`), and
 * wire all of it to the address bar (`useSearchSession`), plus the `#q=` hash
 * helpers they use. The package has no components — its whole surface is five
 * hooks and three pure functions.
 *
 * Every hook case mounts with NO client-search provider bonded (the kit bonds
 * none and seeds none), so the cases pin the documented no-provider contract
 * every framework must share: `useClientSearchIndex` is `null` rather than an
 * error, `useClientSearch` reports no hits while still parsing and tracking the
 * text, and `useSearchSession` keeps its text, filters and keyboard behaviour
 * with only the hits an `augment` adds. No storage provider is bonded either,
 * so the remembered-query path is inert. Hitting a real index — hits, ranking,
 * highlighting, the remembered text — is each package's own unit suite, which
 * bonds the providers itself.
 *
 * The cases never depend on the page's current `location.hash`: the one case
 * that mirrors the text to the address bar (`syncUrl` left at its default)
 * starts with nothing typed and ends by clearing the text again, so it leaves
 * the page as it found it.
 *
 * Three props of `useSearchSession` have no case here, and cannot have one:
 * `rememberKey`/`rememberMs` need a bonded storage provider the kit does not
 * seed (their unit suites cover it), and `augmentWhen` is a function the hook
 * may call a different number of times per render in a framework — the call
 * count is recorded, so a case would hold ports to React's render count rather
 * than to the documented behaviour.
 *
 * @module
 */

import type { HookCases } from '../../bindings/spec.js'
import type { FeatureCases } from '../spec.js'

/** A document the cases search. */
interface Doc extends Record<string, unknown> {
  id: string
  name: string
  category: string
}

/** The documents the cases index. */
const DOCS: Doc[] = [
  { id: 'a', name: 'auth sessions', category: 'auth' },
  { id: 'b', name: 'oauth google', category: 'auth' },
  { id: 'c', name: 'stripe payments', category: 'payments' },
]

/** A fuller document set, as `useLazyDocs`' loader resolves to it. */
const RICH: Doc[] = [...DOCS, { id: 'd', name: 'invoice drafts', category: 'billing' }]

/** How the cases index their documents. */
const OPTIONS = { idField: 'id', fields: ['name'], filterFields: ['category'] }

/**
 * A key press, as a hook's `onKeyDown` receives it: whether it claimed the key
 * is recorded as a `prevent` call.
 *
 * @param key - The `KeyboardEvent.key` value.
 * @param extra - Modifiers held during the press.
 * @returns The event-shaped argument.
 */
const key = (key: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  key,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  preventDefault: { $fn: 'prevent' },
  ...extra,
})

/** `useClientSearchIndex(docs, options)`: an index once the list exists, or `null`. */
const useClientSearchIndexCases: HookCases = {
  hook: 'useClientSearchIndex',
  cases: [
    {
      name: 'no documents yet is null',
      args: [null, OPTIONS],
    },
    {
      name: 'documents without a bonded provider are null',
      args: [DOCS, OPTIONS],
    },
    {
      name: 'a remount with another list is still null without a provider',
      args: [DOCS, OPTIONS],
      steps: [{ type: 'remount', args: [[DOCS[0]], OPTIONS] }],
    },
  ],
}

/** `useClientSearch(index, options)`: the text, its parsed form and the hits. */
const useClientSearchCases: HookCases = {
  hook: 'useClientSearch',
  reactiveArgs: true,
  cases: [
    {
      name: 'blank text browses with no index and no hits',
      args: [null],
    },
    {
      name: 'an initial query starts the text',
      args: [null, { initialQuery: 'stripe' }],
    },
    {
      name: 'typing sets the text and parses a filter',
      args: [null, { limit: 10 }],
      steps: [{ type: 'call', method: 'setQuery', args: ['category:auth google'] }],
    },
    {
      name: 'phrases and exclusions are parsed apart from the terms',
      args: [null],
      steps: [{ type: 'call', method: 'setQuery', args: ['-deprecated "sign in" oauth'] }],
    },
    {
      name: 'clear empties the text and deactivates a typed query',
      args: [null],
      steps: [
        { type: 'call', method: 'setQuery', args: ['auth'] },
        { type: 'call', method: 'clear' },
      ],
    },
    {
      name: 'a debounce holds the text while it waits out the pause',
      args: [null, { debounceMs: 100 }],
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'setQuery', args: ['stripe'] },
        { type: 'advance', ms: 120 },
      ],
    },
    {
      name: 'changed options are followed on the same mount without resetting the text',
      args: [null, { initialQuery: 'one' }],
      steps: [{ type: 'args', args: [null, { initialQuery: 'two', limit: 5 }] }],
    },
  ],
}

/** `useLazyDocs(initial, load)`: the page's own records, then the fuller set. */
const useLazyDocsCases: HookCases = {
  hook: 'useLazyDocs',
  cases: [
    {
      name: 'starts with the initial documents',
      args: [DOCS, { $fn: 'load', resolve: RICH }],
    },
    {
      name: 'the fuller set replaces the initial documents when it loads',
      args: [DOCS, { $fn: 'load', resolve: RICH }],
      fakeTimers: true,
      steps: [{ type: 'advance', ms: 300 }],
    },
    {
      name: 'a failed load keeps the initial documents',
      args: [DOCS, { $fn: 'load', reject: 'offline' }],
      fakeTimers: true,
      steps: [{ type: 'advance', ms: 300 }],
    },
    {
      name: 'unmounting before the load runs starts nothing',
      args: [DOCS, { $fn: 'load', resolve: RICH }],
      fakeTimers: true,
      steps: [{ type: 'unmount' }, { type: 'advance', ms: 300 }],
    },
    {
      name: 'a new initial list reloads the fuller set on a fresh mount',
      args: [DOCS, { $fn: 'load', resolve: RICH }],
      fakeTimers: true,
      steps: [
        {
          type: 'remount',
          args: [[DOCS[0]], { $fn: 'load', resolve: RICH }],
        },
        { type: 'advance', ms: 300 },
      ],
    },
  ],
}

/** `useListNavigation(options)`: the active index and its key handler. */
const useListNavigationCases: HookCases = {
  hook: 'useListNavigation',
  reactiveArgs: true,
  cases: [
    {
      name: 'arrows move, wrap, jump, select and escape',
      args: [{ count: 3, onSelect: { $fn: 'select' }, onEscape: { $fn: 'escape' } }],
      steps: [
        { type: 'call', method: 'onKeyDown', args: [key('ArrowDown')] },
        { type: 'call', method: 'onKeyDown', args: [key('ArrowUp')] },
        { type: 'call', method: 'onKeyDown', args: [key('End')] },
        { type: 'call', method: 'onKeyDown', args: [key('ArrowDown')] },
        { type: 'call', method: 'onKeyDown', args: [key('Home')] },
        { type: 'call', method: 'onKeyDown', args: [key('Enter')] },
        { type: 'call', method: 'onKeyDown', args: [key('Escape')] },
        { type: 'call', method: 'reset' },
      ],
    },
    {
      name: 'modifier combos and a list without looping, then a shrinking list',
      args: [{ count: 3, onSelect: { $fn: 'select' }, loop: false }],
      steps: [
        { type: 'call', method: 'onKeyDown', args: [key('Enter')] },
        { type: 'call', method: 'onKeyDown', args: [key('ArrowDown', { metaKey: true })] },
        { type: 'call', method: 'onKeyDown', args: [key('End')] },
        { type: 'call', method: 'onKeyDown', args: [key('ArrowDown')] },
        {
          type: 'args',
          args: [{ count: 1, onSelect: { $fn: 'select' }, loop: false }],
        },
        {
          type: 'args',
          args: [{ count: 0, onSelect: { $fn: 'select' }, loop: false }],
        },
      ],
    },
    {
      name: 'an empty list ignores the movement keys',
      args: [{ count: 0, onEscape: { $fn: 'escape' } }],
      steps: [
        { type: 'call', method: 'onKeyDown', args: [key('ArrowDown')] },
        { type: 'call', method: 'onKeyDown', args: [key('Home')] },
        { type: 'call', method: 'onKeyDown', args: [key('Escape')] },
        { type: 'call', method: 'setActiveIndex', args: [5] },
        { type: 'call', method: 'reset' },
      ],
    },
    {
      name: 'an initial index, then setActiveIndex moves the highlight',
      args: [{ count: 2, initialIndex: 1 }],
      steps: [
        { type: 'call', method: 'setActiveIndex', args: [0] },
        { type: 'call', method: 'reset' },
        { type: 'call', method: 'onKeyDown', args: [key('Enter')] },
      ],
    },
  ],
}

/** `useSearchSession(config)`: the text, the hits, the keyboard and the address bar. */
const useSearchSessionCases: HookCases = {
  hook: 'useSearchSession',
  cases: [
    {
      name: 'an empty start with no documents has nothing active',
      args: [{ docs: null, options: OPTIONS, onOpen: { $fn: 'open' }, syncUrl: false }],
    },
    {
      name: 'typing sets the text and ranks it',
      args: [{ docs: null, options: OPTIONS, onOpen: { $fn: 'open' }, syncUrl: false }],
      steps: [{ type: 'call', method: 'setQuery', args: ['auth'] }],
    },
    {
      name: 'a filter alone is active but not ranked',
      args: [{ docs: null, options: OPTIONS, onOpen: { $fn: 'open' }, syncUrl: false }],
      steps: [{ type: 'call', method: 'setQuery', args: ['category:auth'] }],
    },
    {
      name: 'removeFilter rewrites the text without that filter',
      args: [{ docs: null, options: OPTIONS, onOpen: { $fn: 'open' }, syncUrl: false }],
      steps: [
        { type: 'call', method: 'setQuery', args: ['category:auth oauth'] },
        { type: 'call', method: 'removeFilter', args: [0] },
      ],
    },
    {
      name: 'escape clears a typed query',
      args: [{ docs: null, options: OPTIONS, onOpen: { $fn: 'open' }, syncUrl: false }],
      steps: [
        { type: 'call', method: 'setQuery', args: ['auth'] },
        { type: 'call', method: 'onKeyDown', args: [key('Escape')] },
      ],
    },
    {
      name: 'escape with nothing typed calls the escape handler',
      args: [
        {
          docs: null,
          options: OPTIONS,
          onOpen: { $fn: 'open' },
          onEscape: { $fn: 'escape' },
          syncUrl: false,
        },
      ],
      steps: [{ type: 'call', method: 'onKeyDown', args: [key('Escape')] }],
    },
    {
      name: 'an augmented hit is appended, highlighted and opened on Enter',
      args: [
        {
          docs: null,
          options: OPTIONS,
          onOpen: { $fn: 'open' },
          augment: { $fn: 'more', resolve: [DOCS[2]] },
          syncUrl: false,
        },
      ],
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'setQuery', args: ['auth sessions'] },
        { type: 'advance', ms: 300 },
        { type: 'call', method: 'onKeyDown', args: [key('ArrowDown')] },
        { type: 'call', method: 'setActiveIndex', args: [0] },
        { type: 'call', method: 'onKeyDown', args: [key('Enter')] },
      ],
    },
    {
      name: 'prefetch warms the top hits once the results settle',
      args: [
        {
          docs: null,
          options: OPTIONS,
          onOpen: { $fn: 'open' },
          prefetch: { $fn: 'warm' },
          augment: { $fn: 'more', resolve: [DOCS[0], DOCS[2]] },
          syncUrl: false,
        },
      ],
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'setQuery', args: ['auth sessions'] },
        { type: 'advance', ms: 300 },
        { type: 'advance', ms: 400 },
      ],
    },
    {
      name: 'a longer augment delay holds the extra hits until it passes',
      args: [
        {
          docs: null,
          options: OPTIONS,
          onOpen: { $fn: 'open' },
          augment: { $fn: 'more', resolve: [DOCS[2]] },
          augmentDelayMs: 500,
          syncUrl: false,
        },
      ],
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'setQuery', args: ['auth sessions'] },
        { type: 'advance', ms: 200 },
        { type: 'advance', ms: 400 },
      ],
    },
    {
      name: 'a remount starts a fresh session',
      args: [{ docs: null, options: OPTIONS, onOpen: { $fn: 'open' }, syncUrl: false }],
      steps: [
        { type: 'call', method: 'setQuery', args: ['auth'] },
        {
          type: 'remount',
          args: [{ docs: DOCS, options: OPTIONS, onOpen: { $fn: 'open' }, syncUrl: false }],
        },
      ],
    },
    {
      name: 'the address bar is mirrored while typing and cleared again',
      args: [{ docs: null, options: OPTIONS, onOpen: { $fn: 'open' } }],
      fakeTimers: true,
      steps: [
        { type: 'call', method: 'setQuery', args: ['auth'] },
        { type: 'advance', ms: 200 },
        { type: 'call', method: 'clear' },
        { type: 'advance', ms: 200 },
      ],
    },
  ],
}

/** `@molecule/app-client-search-react`. */
export const clientSearchFeature: FeatureCases = {
  package: '@molecule/app-client-search-react',
  families: [],
  hooks: [
    useClientSearchCases,
    useClientSearchIndexCases,
    useLazyDocsCases,
    useListNavigationCases,
    useSearchSessionCases,
  ],
  values: [
    {
      export: 'readHashQuery',
      calls: [
        [''],
        ['#'],
        ['#q='],
        ['#q=user%20feedback'],
        ['#q=user+feedback'],
        ['#q=%E0%A4%A'],
        ['#q=a%3Db'],
        ['#auth'],
        ['#auth', {}],
        ['#auth', { legacyField: 'category' }],
        ['#%61uth', { legacyField: 'category' }],
        ['#  ', { legacyField: 'category' }],
        ['#a=b', { legacyField: 'category' }],
      ],
    },
    {
      export: 'hashForQuery',
      calls: [
        [''],
        ['   '],
        ['a b'],
        ['a b '],
        ['category:auth oauth'],
        ['a+b'],
        ['ünïcode'],
        ['a/b?c=d&e'],
      ],
    },
    {
      export: 'writeHashQuery',
      calls: [[''], ['a b'], ['two', 'push'], ['']],
    },
  ],
}
