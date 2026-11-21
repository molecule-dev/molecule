/**
 * Types of `@molecule/app-search-autocomplete-angular` — the Angular
 * counterpart of `@molecule/app-search-autocomplete-react`, the same props
 * (React names) and the same DOM for the same input.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A single suggestion entry returned by `onSearch` or passed via `suggestions`.
 */
export interface SuggestionItem<T = unknown> {
  id: string
  /** Display label: text, or a template rendering any node (`TemplateRef`). */
  label: string | TemplateRef<unknown>
  /** Optional secondary line / category: text, or a template rendering any node. */
  meta?: string | TemplateRef<unknown>
  /** Original payload for the selection callback. */
  data?: T
}

/** Props accepted by the {@link SearchAutocomplete} component. */
export interface SearchAutocompleteProps<T = unknown> {
  /** Current input value. */
  value: string
  /** Called whenever the input changes (an input: pass a function, as React does). */
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
