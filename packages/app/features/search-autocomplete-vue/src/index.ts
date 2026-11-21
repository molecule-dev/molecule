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
 * Vue counterpart of `@molecule/app-search-autocomplete-react`: the same
 * exports, the same props (React names), the same ClassMap tokens and the same
 * DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { moleculePlugin } from '@molecule/app-vue'
 * import { SearchAutocomplete } from '@molecule/app-search-autocomplete-vue'
 * import type { SuggestionItem } from '@molecule/app-search-autocomplete-vue'
 *
 * const UserSearch = defineComponent({
 *   setup() {
 *     const query = ref('')
 *     const fetchUsers = (q: string): Promise<SuggestionItem<{ id: string }>[]> =>
 *       fetch(`/api/users?q=${encodeURIComponent(q)}`).then((r) => r.json())
 *
 *     return () =>
 *       h(SearchAutocomplete, {
 *         value: query.value,
 *         onChange: (next: string) => {
 *           query.value = next
 *         },
 *         onSearch: fetchUsers,
 *         onSelect: (item) => console.log(item.data?.id),
 *         placeholder: 'Search users…',
 *       })
 *   },
 * })
 *
 * const app = createApp(UserSearch)
 * app.use(moleculePlugin, { i18n: i18nProvider })
 * app.mount('#app')
 * ```
 *
 * @remarks
 * - Throws unless mounted under `moleculePlugin` (from `@molecule/app-vue`)
 *   with a bonded ClassMap.
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

export * from './SearchAutocomplete.js'
export * from './types.js'
