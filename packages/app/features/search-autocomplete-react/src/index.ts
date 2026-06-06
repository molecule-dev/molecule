/**
 * Search input with typeahead suggestions.
 *
 * Exports `<SearchAutocomplete>` and `SuggestionItem` type.
 *
 * @example
 * ```tsx
 * import { SearchAutocomplete } from '@molecule/app-search-autocomplete-react'
 *
 * const [query, setQuery] = useState('')
 *
 * <SearchAutocomplete
 *   value={query}
 *   onChange={setQuery}
 *   onSearch={async (q) => fetchUsers(q)}
 *   onSelect={(item) => navigate(`/users/${item.id}`)}
 *   placeholder="Search users…"
 * />
 * ```
 *
 * @module
 */

export * from './SearchAutocomplete.js'
