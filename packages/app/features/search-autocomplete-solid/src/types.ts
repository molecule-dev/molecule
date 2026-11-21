/**
 * Types of `@molecule/app-search-autocomplete-solid` — the Solid counterpart of
 * `@molecule/app-search-autocomplete-react`, the same props (React names) and
 * the same DOM for the same input.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/**
 * A single suggestion entry returned by `onSearch` or passed via `suggestions`.
 */
export interface SuggestionItem<T = unknown> {
  id: string
  label: JSX.Element
  /** Optional secondary line / category. */
  meta?: JSX.Element
  /** Original payload for the selection callback. */
  data?: T
}

/** Props accepted by the {@link SearchAutocomplete} component. */
export interface SearchAutocompleteProps<T = unknown> {
  /** Current input value. */
  value: string
  /** Called whenever the input changes. */
  onChange: (value: string) => void
  /** Async search function — receives the query, returns suggestions. */
  onSearch?: (query: string) => Promise<SuggestionItem<T>[]> | SuggestionItem<T>[]
  /** Optional pre-computed suggestion list (when caller controls fetching). */
  suggestions?: SuggestionItem<T>[]
  /** Called when the user picks a suggestion. */
  onSelect: (item: SuggestionItem<T>) => void
  /** Placeholder. */
  placeholder?: string
  /**
   * Accessible name for the input, rendered as `aria-label`. Defaults to the
   * translated `search.aria.label`: a placeholder is not a label, so an input
   * named only by its placeholder (let alone an empty one) is nameless for
   * assistive technology.
   */
  ariaLabel?: string
  /** Debounce ms for `onSearch`. Defaults to 200. */
  debounceMs?: number
  /** Min chars before suggestions appear. Defaults to 1. */
  minChars?: number
  /** Extra classes on the wrapper. */
  className?: string
}
