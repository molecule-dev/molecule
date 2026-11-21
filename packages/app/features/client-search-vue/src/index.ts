/**
 * Vue composables for `@molecule/app-client-search`.
 *
 * Three headless composables: {@link useClientSearchIndex} builds the index
 * from a list, {@link useClientSearch} keeps an input's text and its hits, and
 * {@link useListNavigation} moves through the hits with the keyboard. The app
 * renders the input and the list itself, styled with `getClassMap()`.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue'
 * import {
 *   useClientSearch,
 *   useClientSearchIndex,
 *   useListNavigation,
 * } from '@molecule/app-client-search-vue'
 *
 * const props = defineProps<{ packages: Pkg[] }>()
 * const index = useClientSearchIndex(() => props.packages, {
 *   idField: 'name',
 *   fields: ['name', 'description', 'exports'],
 *   filterFields: ['category', 'type'],
 *   boost: { name: 3 },
 * })
 * const { query, setQuery, hits } = useClientSearch(index, { limit: 50 })
 * const nav = useListNavigation(() => ({
 *   count: hits.value.length,
 *   onSelect: (i) => navigate(`/packages/${hits.value[i].id}`),
 *   onEscape: () => setQuery(''),
 * }))
 * </script>
 *
 * <template>
 *   <input
 *     :value="query"
 *     @input="setQuery(($event.target as HTMLInputElement).value)"
 *     @keydown="nav.onKeyDown"
 *   />
 *   <ul>
 *     <li v-for="(h, i) in hits" :key="h.id" :aria-selected="i === nav.activeIndex.value">
 *       {{ h.doc.name }}
 *     </li>
 *   </ul>
 * </template>
 * ```
 *
 * @remarks
 * - **Pass a stable list.** `useClientSearchIndex` rebuilds only when the
 *   `docs` array identity changes; a list recreated on every render (`.filter`
 *   in the template body) rebuilds the index on every keystroke. Keep it in a
 *   `shallowRef`, a store, or the props it came from.
 * - **Blank text returns every document**, so the same list renders the
 *   browse state and the search state; there is no separate "no query" path
 *   to write. Check `active` when the empty state should look different.
 * - `useListNavigation` resets the highlight when the hit count changes and
 *   ignores keys with modifiers, so `Cmd+Enter` and friends stay free for the
 *   app. Wire `Enter` to real navigation (the URL changes), not just a
 *   highlight.
 * - `useSearchSession` is the whole thing wired up: text ↔ `#q=` in the address
 *   bar, a remembered query across pages (through the bonded storage), keyboard
 *   navigation, Enter opening a hit, top hits prefetched, and an optional
 *   `augment` that appends hits from elsewhere (an API) as "related".
 * - These composables render nothing and register no global key. Bind `/` or
 *   `Cmd+K` to focus the input through `@molecule/app-keyboard-shortcuts-vue`.
 *
 * @module
 */

export * from './hashQuery.js'
export * from './types.js'
export * from './useClientSearch.js'
export * from './useClientSearchIndex.js'
export * from './useLazyDocs.js'
export * from './useListNavigation.js'
export * from './useSearchSession.js'
