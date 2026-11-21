/**
 * Types for the Solid client-search primitives.
 *
 * A Solid value field is an accessor (`query()`, `hits()`) and a method is a
 * plain function, so `const { query, hits } = useClientSearch(index)` reads
 * `query()` and `hits()` where the React package's plain fields go.
 *
 * @module
 */

import type { Accessor } from 'solid-js'

import type {
  ClientSearchDocument,
  ClientSearchHit,
  ClientSearchIndexOptions,
  ParsedQuery,
} from '@molecule/app-client-search'

/** What the address bar's hash says about the search. */
export interface HashQuery {
  /** The query, or `''`. */
  query: string

  /**
   * The hash was a plain anchor (`#auth`), read as `<legacyField>:auth`; the
   * caller may rewrite it to the `#q=` form.
   */
  legacy: boolean
}

/** Options for {@link readHashQuery}. */
export interface ReadHashQueryOptions {
  /**
   * A field to turn a plain anchor into a filter for: with `'category'`,
   * `#auth` reads as `category:auth`. Without it a plain anchor is not a query.
   */
  legacyField?: string
}

/** Options for {@link useClientSearch}. */
export interface UseClientSearchOptions {
  /** The text to start with (e.g. from the URL). */
  initialQuery?: string

  /** Maximum hits. Defaults to `50`. */
  limit?: number

  /**
   * Milliseconds to wait after the last keystroke before searching. `0` (the
   * default) searches synchronously on every change, which an in-memory index
   * handles comfortably; raise it only for very large lists.
   */
  debounceMs?: number
}

/** What {@link useClientSearch} returns. */
export interface ClientSearchState<T extends ClientSearchDocument> {
  /** The text as typed. Bind it to the input's `value`. */
  query: Accessor<string>

  /** Sets the text. Bind it to the input's `onInput`. */
  setQuery: (query: string) => void

  /** The text in its parsed form (terms, phrases, filters, exclusions). */
  parsed: Accessor<ParsedQuery>

  /** The hits for the current (debounced) text; every document when the text is empty. */
  hits: Accessor<ClientSearchHit<T>[]>

  /** Whether the text is non-blank. */
  active: Accessor<boolean>

  /** Clears the text. */
  clear: () => void
}

/** Options for {@link useListNavigation}. */
export interface UseListNavigationOptions {
  /** How many items there are. The active index is clamped to it. */
  count: number

  /** Called with the active index on Enter. */
  onSelect?: (index: number) => void

  /** Called on Escape (e.g. clear the input or close the panel). */
  onEscape?: () => void

  /** Wrap from the last item to the first and back. Defaults to `true`. */
  loop?: boolean

  /** The index active before any key is pressed. `-1` (the default) means none. */
  initialIndex?: number
}

/** What {@link useListNavigation} returns. */
export interface ListNavigation {
  /** The active item, or `-1`. */
  activeIndex: Accessor<number>

  /** Sets the active item (e.g. on pointer hover). */
  setActiveIndex: (index: number) => void

  /** Attach to the input (or the list) as its `onKeyDown`. */
  onKeyDown: (event: KeyboardEvent) => void

  /** Back to no active item. */
  reset: () => void
}

/** A hit, possibly one an augmenting search added. */
export type SessionHit<T extends ClientSearchDocument> = ClientSearchHit<T> & {
  /** Found by an augmenting search (for example by meaning) rather than by the words typed. */
  related?: boolean
}

/** What {@link useSearchSession} needs to know. */
export interface SearchSessionConfig<T extends ClientSearchDocument> {
  /** The documents, or `null` until they exist. Keep the array identity stable. */
  docs: T[] | null

  /** How to index them. Keep the object identity stable (a module constant). */
  options: ClientSearchIndexOptions<T>

  /** Maximum hits. Defaults to `60`. */
  limit?: number

  /**
   * Keep the text in the URL hash (`#q=…`) and read it back on load and on
   * Back/Forward. Defaults to `true`.
   */
  syncUrl?: boolean

  /** The field a plain `#anchor` in the URL stands for (`'category'` makes `#auth` mean `category:auth`). */
  legacyHashField?: string

  /**
   * Share the text between pages through the bonded storage under this key,
   * for `rememberMs`. Omit to keep nothing.
   */
  rememberKey?: string

  /** How long a remembered text is offered back. Defaults to 30 minutes. */
  rememberMs?: number

  /** Opens a hit (Enter, or a click on its row). */
  onOpen: (doc: T) => void

  /** Warms a hit's page ahead of time (hover, focus, and the top hits once results settle). */
  prefetch?: (doc: T) => void

  /** Escape with nothing typed. Defaults to blurring the input; a dialog closes instead. */
  onEscape?: () => void

  /**
   * More hits for the current query from elsewhere (an API, a semantic
   * index): called after typing pauses, its results are appended after the
   * index's own hits, marked `related`; ids already present are skipped.
   * Return nothing for no extra hits.
   */
  augment?: (parsed: ParsedQuery, signal: AbortSignal) => Promise<T[] | undefined | void>

  /** Milliseconds to wait after typing before calling `augment`. Defaults to `250`. */
  augmentDelayMs?: number

  /** Only call `augment` when this returns `true` for the query. Defaults to "two or more words, or a phrase". */
  augmentWhen?: (parsed: ParsedQuery) => boolean
}

/** Everything a search box and a results list share. */
export interface SearchSession<T extends ClientSearchDocument> {
  /** Bind it to the input with `ref={(el) => (session.inputRef.current = el)}`. */
  inputRef: { current: HTMLInputElement | null }
  query: Accessor<string>
  setQuery: (query: string) => void
  clear: () => void
  parsed: Accessor<ParsedQuery>
  hits: Accessor<SessionHit<T>[]>
  /** Anything typed at all (text, a phrase, or a filter). */
  active: Accessor<boolean>
  /** Free text or a phrase is present, so hits are ranked rather than browsed. */
  ranked: Accessor<boolean>
  activeIndex: Accessor<number>
  setActiveIndex: (index: number) => void
  /** Attach to the input as its `onKeyDown`. */
  onKeyDown: (event: KeyboardEvent) => void
  /** Removes the i-th filter from the text. */
  removeFilter: (index: number) => void
  /** Opens a hit and commits the search to history. */
  open: (doc: T) => void
  prefetch: (doc: T) => void
  /** Focuses the input and selects its text. */
  focus: () => void
}
