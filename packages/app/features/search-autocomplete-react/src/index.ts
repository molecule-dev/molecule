/**
 * Search input with a typeahead suggestion popover.
 *
 * Exports `<SearchAutocomplete>` and the `SuggestionItem<T>` type
 * (`{ id, label, meta?, data? }`). Two data modes — pass ONE of:
 * `onSearch(query)` (async fetch, debounced; default 200 ms) or
 * `suggestions` (caller-controlled list). Other props: `value` / `onChange`
 * (controlled input), `onSelect(item)`, `placeholder?` (defaults to the
 * translated `search.placeholder`), `debounceMs?`, `minChars?` (default 1),
 * `className?`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { SearchAutocomplete } from '@molecule/app-search-autocomplete-react'
 * import type { SuggestionItem } from '@molecule/app-search-autocomplete-react'
 *
 * function UserSearch({ fetchUsers, onPick }: {
 *   fetchUsers: (q: string) => Promise<SuggestionItem<{ id: string }>[]>
 *   onPick: (id: string) => void
 * }) {
 *   const [query, setQuery] = useState('')
 *   return (
 *     <SearchAutocomplete
 *       value={query}
 *       onChange={setQuery}
 *       onSearch={fetchUsers}
 *       onSelect={(item) => (item.data ? onPick(item.data.id) : undefined)}
 *       placeholder="Search users…"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Throws unless rendered inside `<I18nProvider>` (from
 *   `@molecule/app-react`) with a bonded ClassMap.
 * - Suggestion selection is MOUSE-ONLY: no arrow-key/Enter navigation is
 *   implemented. Add your own key handling when keyboard support matters.
 * - Rapid typing can apply an out-of-order `onSearch` result (no request
 *   cancellation) — keep `onSearch` fast or raise `debounceMs`.
 * - The popover surface uses `var(--color-surface)` with a WHITE fallback
 *   and black-alpha borders — define `--color-surface` (dark themes) or the
 *   dropdown stays light.
 * - Default placeholder translations: `@molecule/app-locales-search-autocomplete`.
 *
 * @module
 */

export * from './SearchAutocomplete.js'
