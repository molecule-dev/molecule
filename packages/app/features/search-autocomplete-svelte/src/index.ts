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
 * Svelte counterpart of `@molecule/app-search-autocomplete-react`: the same
 * exports, the same props (React names), the same ClassMap tokens and the same
 * DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { SearchAutocomplete } from '@molecule/app-search-autocomplete-svelte'
 *   import type { SuggestionItem } from '@molecule/app-search-autocomplete-svelte'
 *
 *   let { fetchUsers, onPick }: {
 *     fetchUsers: (q: string) => Promise<SuggestionItem<{ id: string }>[]>
 *     onPick: (id: string) => void
 *   } = $props()
 *
 *   let query = $state('')
 * </script>
 *
 * <SearchAutocomplete
 *   value={query}
 *   onChange={(next) => (query = next)}
 *   onSearch={fetchUsers}
 *   onSelect={(item) => (item.data ? onPick(item.data.id) : undefined)}
 *   placeholder="Search users…"
 * />
 * ```
 *
 * @remarks
 * - Throws unless rendered under the Svelte binding's molecule context
 *   (from `@molecule/app-svelte`) with a bonded ClassMap.
 * - Full keyboard support: it's an ARIA combobox — ArrowDown/ArrowUp move the
 *   highlight (opening the popover), Enter selects the highlighted option, and
 *   Escape closes. `aria-activedescendant` tracks the active `role="option"`.
 * - Stale-response safe: out-of-order `onSearch` responses are dropped (each
 *   request carries a token; only the latest applies), so a slow earlier fetch
 *   can't overwrite fresher results. `onSearch` needs no cancellation of its own.
 * - The popover surface uses `var(--color-surface)` with a WHITE fallback
 *   and black-alpha borders — define `--color-surface` (dark themes) or the
 *   dropdown stays light.
 * - Default placeholder translations: `@molecule/app-locales-search-autocomplete`.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
