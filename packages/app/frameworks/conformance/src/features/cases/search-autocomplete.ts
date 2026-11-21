/**
 * `@molecule/app-search-autocomplete-react` cases: the search input with its
 * typeahead popover — the closed input surface, the ARIA combobox wiring, both
 * data modes (`suggestions` and the debounced `onSearch`), the keyboard
 * highlight/select/close machine, pointer selection, the outside-mousedown
 * close, the stale-response race guard, and every prop change.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The input the component renders (one per component). */
const input = 'input'

/** The suggestion popover. */
const listbox = '[role="listbox"]'

/** Three plain suggestions, as a controlled `suggestions` list. */
const suggestions = [
  { id: '1', label: 'Alpha' },
  { id: '2', label: 'Beta' },
  { id: '3', label: 'Gamma' },
]

/** The same three suggestions as fresh equal objects, for a prop step. */
const otherSuggestions = [
  { id: '1', label: 'Alpha' },
  { id: '2', label: 'Beta' },
  { id: '3', label: 'Gamma' },
]

/** Suggestions carrying a secondary `meta` line, and one without it. */
const withMeta = [
  { id: 'a', label: 'Apple', meta: 'Fruit' },
  { id: 'b', label: 'Banana', meta: 'Also a fruit' },
  { id: 'c', label: 'Carrot' },
]

/** Suggestions whose original payload is handed back to `onSelect`. */
const withData = [
  { id: 'u1', label: 'Ada', data: { userId: 'u1' } },
  { id: 'u2', label: 'Grace', data: { userId: 'u2' } },
]

/** Suggestions whose label and meta are rich nodes rather than text. */
const richSuggestions = [
  {
    id: 'r1',
    label: { $nodes: [{ tag: 'strong', attrs: { 'data-label': 'r1' }, children: ['Rich one'] }] },
    meta: { $nodes: [{ tag: 'em', attrs: { 'data-meta': 'r1' }, children: ['first'] }] },
  },
  {
    id: 'r2',
    label: { $nodes: [{ tag: 'span', attrs: { 'data-label': 'r2' }, children: ['Rich two'] }] },
  },
]

/** One suggestion whose label is empty text, so the row's label div renders empty. */
const emptyLabel = [{ id: 'e1', label: '', meta: 'Nothing above' }]

/** The value the async-mode cases start from. */
const query = 'o'

/** One row of a searched result list. */
const searchedResult = [{ id: 's1', label: 'Search hit' }]

/** A second searched result list, for the out-of-order settle. */
const freshResult = [{ id: 's2', label: 'Fresh hit' }]

/** A single controlled suggestion, for the shrinking-list case. */
const oneSuggestion = [{ id: '1', label: 'Alpha' }]

/** The suggestion popover is open, via a focus at the default `minChars` of 1. */
const openByFocus = [{ type: 'focus', selector: input } as const]

/** `@molecule/app-search-autocomplete-react`. */
export const searchAutocompleteFeature: FeatureCases = {
  package: '@molecule/app-search-autocomplete-react',
  families: [
    {
      component: 'SearchAutocomplete',
      cases: [
        {
          name: 'defaults: an empty closed input',
          props: { value: '' },
        },
        {
          name: 'a value in the input',
          props: { value: 'react' },
        },
        {
          name: 'the default placeholder',
          props: { value: '', placeholder: undefined },
        },
        {
          name: 'a custom placeholder',
          props: { value: '', placeholder: 'Find a project' },
        },
        {
          name: 'a custom accessible name for the input',
          props: { value: '', ariaLabel: 'Find a project' },
        },
        {
          name: 'className passthrough',
          props: { value: '', className: 'parity-token' },
        },
        {
          name: 'the className changes',
          props: { value: '', className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
        {
          name: 'a closed input with suggestions renders no listbox',
          props: { value: 'q', suggestions },
        },
        {
          name: 'focus opens the listbox',
          props: { value: 'q', suggestions },
          interactions: openByFocus,
        },
        {
          name: 'focus with an empty list renders no listbox',
          props: { value: 'q', suggestions: [] },
          interactions: openByFocus,
        },
        {
          name: 'focus below minChars does not open',
          props: { value: 'a', suggestions, minChars: 2 },
          interactions: openByFocus,
        },
        {
          name: 'focus at exactly minChars opens',
          props: { value: 'ab', suggestions, minChars: 2 },
          interactions: openByFocus,
        },
        {
          name: 'minChars defaults to one',
          props: { value: '', suggestions },
          interactions: openByFocus,
        },
        {
          name: 'minChars zero opens with an empty value',
          props: { value: '', suggestions, minChars: 0 },
          interactions: openByFocus,
        },
        {
          name: 'typing calls onChange and opens the popover',
          props: { value: '', suggestions },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: input, value: 'o' }],
        },
        {
          name: 'onChange receives each typed query',
          props: { value: '', suggestions },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: input, value: 'a' },
            { type: 'input', selector: input, value: 'ab' },
          ],
        },
        {
          name: 'typing with an empty list stays collapsed',
          props: { value: '', suggestions: [] },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: input, value: 'o' }],
        },
        {
          name: 'the value prop changes',
          props: { value: 'one', suggestions },
          interactions: [{ type: 'props', props: { value: 'two' } }],
        },
        {
          name: 'suggestion rows with a meta line',
          props: { value: 'q', suggestions: withMeta },
          interactions: openByFocus,
        },
        {
          name: 'suggestion rows with rich label nodes',
          props: { value: 'q', suggestions: richSuggestions },
          interactions: openByFocus,
        },
        {
          name: 'a suggestion with an empty label',
          props: { value: 'q', suggestions: emptyLabel },
          interactions: openByFocus,
        },
        {
          name: 'the suggestions prop changes while open',
          props: { value: 'q', suggestions },
          interactions: [
            ...openByFocus,
            { type: 'props', props: { suggestions: otherSuggestions } },
            { type: 'props', props: { suggestions: oneSuggestion } },
          ],
        },
        {
          name: 'mouseenter highlights a row',
          props: { value: 'q', suggestions },
          interactions: [
            ...openByFocus,
            { type: 'mouseenter', selector: `${listbox} [role="option"]:nth-of-type(2)` },
          ],
        },
        {
          name: 'mouseleave keeps the highlight',
          props: { value: 'q', suggestions },
          interactions: [
            ...openByFocus,
            { type: 'mouseenter', selector: `${listbox} [role="option"]:nth-of-type(2)` },
            { type: 'mouseleave', selector: `${listbox} [role="option"]:nth-of-type(2)` },
          ],
        },
        {
          name: 'pressing a row selects it and closes the popover',
          props: { value: 'q', suggestions },
          callbacks: ['onSelect'],
          interactions: [
            ...openByFocus,
            { type: 'click', selector: `${listbox} [role="option"]:nth-of-type(2)` },
          ],
        },
        {
          name: 'the selected suggestion carries its data payload',
          props: { value: 'q', suggestions: withData },
          callbacks: ['onSelect'],
          interactions: [
            ...openByFocus,
            { type: 'click', selector: `${listbox} [role="option"]:nth-of-type(2)` },
          ],
        },
        {
          name: 'pressing the already-highlighted row selects it',
          props: { value: 'q', suggestions },
          callbacks: ['onSelect'],
          interactions: [
            ...openByFocus,
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'click', selector: `${listbox} [role="option"]:nth-of-type(1)` },
          ],
        },
        {
          name: 'ArrowDown opens the popover without highlighting',
          props: { value: 'q', suggestions },
          interactions: [{ type: 'keydown', selector: input, key: 'ArrowDown' }],
        },
        {
          name: 'ArrowDown with an empty list does nothing',
          props: { value: 'q', suggestions: [] },
          interactions: [{ type: 'keydown', selector: input, key: 'ArrowDown' }],
        },
        {
          name: 'ArrowDown moves the highlight forward',
          props: { value: 'q', suggestions },
          interactions: [
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'ArrowDown' },
          ],
        },
        {
          name: 'ArrowDown wraps from the last row to the first',
          props: { value: 'q', suggestions },
          interactions: [
            ...openByFocus,
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'ArrowDown' },
          ],
        },
        {
          name: 'ArrowUp opens the popover',
          props: { value: 'q', suggestions },
          interactions: [{ type: 'keydown', selector: input, key: 'ArrowUp' }],
        },
        {
          name: 'ArrowUp wraps from no highlight to the last row',
          props: { value: 'q', suggestions },
          interactions: [...openByFocus, { type: 'keydown', selector: input, key: 'ArrowUp' }],
        },
        {
          name: 'ArrowUp walks back and wraps from the first row',
          props: { value: 'q', suggestions },
          interactions: [
            ...openByFocus,
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'ArrowUp' },
            { type: 'keydown', selector: input, key: 'ArrowUp' },
            { type: 'keydown', selector: input, key: 'ArrowUp' },
          ],
        },
        {
          name: 'Enter selects the highlighted row',
          props: { value: 'q', suggestions },
          callbacks: ['onSelect'],
          interactions: [
            ...openByFocus,
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'Enter' },
          ],
        },
        {
          name: 'Enter without a highlighted row does not select',
          props: { value: 'q', suggestions },
          callbacks: ['onSelect'],
          interactions: [...openByFocus, { type: 'keydown', selector: input, key: 'Enter' }],
        },
        {
          name: 'Enter when the highlight is past a shrunk list does not select',
          props: { value: 'q', suggestions },
          callbacks: ['onSelect'],
          interactions: [
            ...openByFocus,
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'props', props: { suggestions: oneSuggestion } },
            { type: 'keydown', selector: input, key: 'Enter' },
          ],
        },
        {
          name: 'Escape closes the popover and clears the highlight',
          props: { value: 'q', suggestions },
          callbacks: ['onSelect'],
          interactions: [
            ...openByFocus,
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'Escape' },
            { type: 'keydown', selector: input, key: 'Enter' },
          ],
        },
        {
          name: 'Escape while closed changes nothing',
          props: { value: 'q', suggestions },
          interactions: [{ type: 'keydown', selector: input, key: 'Escape' }],
        },
        {
          name: 'another key does nothing',
          props: { value: 'q', suggestions },
          callbacks: ['onSelect'],
          interactions: [
            ...openByFocus,
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'Tab' },
            { type: 'keydown', selector: input, key: 'Enter' },
          ],
        },
        {
          name: 'a value change resets the highlight',
          props: { value: 'q', suggestions },
          interactions: [
            ...openByFocus,
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'keydown', selector: input, key: 'ArrowDown' },
            { type: 'props', props: { value: 'qu' } },
          ],
        },
        {
          name: 'minChars does not gate the ArrowDown open',
          props: { value: 'a', suggestions, minChars: 2 },
          interactions: [{ type: 'keydown', selector: input, key: 'ArrowDown' }],
        },
        {
          name: 'a mousedown outside closes the popover',
          props: { value: 'q', suggestions },
          interactions: [...openByFocus, { type: 'pointerdown', selector: 'body' }],
        },
        {
          name: 'a mousedown inside the listbox keeps it open',
          props: { value: 'q', suggestions },
          interactions: [...openByFocus, { type: 'pointerdown', selector: listbox }],
        },
        {
          name: 'a mousedown on the input keeps the popover open',
          props: { value: 'q', suggestions },
          interactions: [...openByFocus, { type: 'pointerdown', selector: input }],
        },
        {
          name: 'blur leaves the popover open',
          props: { value: 'q', suggestions },
          interactions: [...openByFocus, { type: 'blur', selector: input }],
        },
        {
          name: 'the debounced search fills the popover',
          props: { value: query },
          callbacks: ['onSearch'],
          callbackResults: { onSearch: { returns: searchedResult } },
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 200 }, ...openByFocus],
        },
        {
          name: 'a custom debounce waits before searching',
          props: { value: query, debounceMs: 500 },
          callbacks: ['onSearch'],
          callbackResults: { onSearch: { returns: searchedResult } },
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 499 }, ...openByFocus, { type: 'advance', ms: 1 }],
        },
        {
          name: 'a query shorter than minChars is never searched',
          props: { value: 'a', minChars: 2 },
          callbacks: ['onSearch'],
          callbackResults: { onSearch: { returns: [] } },
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 200 }],
        },
        {
          name: 'the debounce restarts when the value changes mid-wait',
          props: { value: 'o', debounceMs: 100 },
          callbacks: ['onSearch'],
          callbackResults: { onSearch: { returns: searchedResult } },
          fakeTimers: true,
          interactions: [
            { type: 'advance', ms: 50 },
            { type: 'props', props: { value: 'op' } },
            { type: 'advance', ms: 50 },
            { type: 'advance', ms: 50 },
            ...openByFocus,
          ],
        },
        {
          name: 'a failed search leaves no suggestions',
          props: { value: query },
          callbacks: ['onSearch'],
          callbackResults: { onSearch: { reject: 'search is down' } },
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 200 }, ...openByFocus],
        },
        {
          name: 'an earlier response that resolves after a newer request is dropped',
          props: { value: 'o', debounceMs: 10 },
          callbacks: ['onSearch'],
          callbackResults: { onSearch: { defer: true } },
          fakeTimers: true,
          interactions: [
            { type: 'advance', ms: 10 },
            { type: 'props', props: { value: 'op' } },
            { type: 'advance', ms: 10 },
            { type: 'settle', callback: 'onSearch', value: searchedResult },
            ...openByFocus,
            { type: 'settle', callback: 'onSearch', value: freshResult },
          ],
        },
        {
          name: 'controlled suggestions win over search results',
          props: { value: query, suggestions },
          callbacks: ['onSearch'],
          callbackResults: { onSearch: { returns: searchedResult } },
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 200 }, ...openByFocus],
        },
        {
          name: 'a debounceMs change restarts the timer',
          props: { value: query, debounceMs: 200 },
          callbacks: ['onSearch'],
          callbackResults: { onSearch: { returns: searchedResult } },
          fakeTimers: true,
          interactions: [
            { type: 'advance', ms: 100 },
            { type: 'props', props: { debounceMs: 50 } },
            { type: 'advance', ms: 50 },
            ...openByFocus,
          ],
        },
        {
          name: 'a value below minChars clears the search results',
          props: { value: 'op', minChars: 2 },
          callbacks: ['onSearch'],
          callbackResults: { onSearch: { returns: searchedResult } },
          fakeTimers: true,
          interactions: [
            { type: 'advance', ms: 200 },
            ...openByFocus,
            { type: 'props', props: { value: 'o' } },
          ],
        },
        {
          name: 'a minChars increase hides the results on the next value',
          props: { value: 'op', minChars: 1 },
          callbacks: ['onSearch'],
          callbackResults: { onSearch: { returns: searchedResult } },
          fakeTimers: true,
          interactions: [
            { type: 'advance', ms: 200 },
            ...openByFocus,
            { type: 'props', props: { value: 'o', minChars: 2 } },
            { type: 'advance', ms: 200 },
          ],
        },
        {
          name: 'a search that returns an empty list renders no popover',
          props: { value: query },
          callbacks: ['onSearch'],
          callbackResults: { onSearch: { returns: [] } },
          fakeTimers: true,
          interactions: [{ type: 'advance', ms: 200 }, ...openByFocus],
        },
        {
          name: 'an empty placeholder string is kept as is',
          props: { value: 'q', suggestions, placeholder: '' },
          interactions: openByFocus,
        },
      ],
    },
  ],
}
