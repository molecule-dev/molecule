/**
 * Svelte hooks for `@molecule/app-client-search`.
 *
 * Three headless hooks: {@link useClientSearchIndex} builds the index from a
 * list, {@link useClientSearch} keeps an input's text and its hits, and
 * {@link useListNavigation} moves through the hits with the keyboard. The app
 * renders the input and the list itself, styled with `getClassMap()`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import {
 *     useClientSearch,
 *     useClientSearchIndex,
 *     useListNavigation,
 *   } from '@molecule/app-client-search-svelte'
 *
 *   let { packages }: { packages: Pkg[] } = $props()
 *   const index = useClientSearchIndex(() => packages, {
 *     idField: 'name',
 *     fields: ['name', 'description', 'exports'],
 *     filterFields: ['category', 'type'],
 *     boost: { name: 3 },
 *   })
 *   const search = useClientSearch(index, { limit: 50 })
 *   const nav = useListNavigation({
 *     count: 0,
 *     onSelect: (i) => navigate(`/packages/${$search.hits[i].id}`),
 *     onEscape: () => $search.setQuery(''),
 *   })
 * </script>
 *
 * <input value={$search.query} oninput={(e) => $search.setQuery(e.currentTarget.value)} onkeydown={$nav.onKeyDown} />
 * <ul>
 *   {#each $search.hits as hit, i (hit.id)}
 *     <li aria-selected={i === $nav.activeIndex}>{hit.doc.name}</li>
 *   {/each}
 * </ul>
 * ```
 *
 * @remarks
 * - **Pass a stable list.** `useClientSearchIndex` rebuilds only when the
 *   `docs` array identity changes; a list recreated on every render (`.filter`
 *   in the markup) rebuilds the index on every keystroke. Keep it in a store.
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
 * - These hooks render nothing and register no global key. Bind `/` or
 *   `Cmd+K` to focus the input through `@molecule/app-keyboard-shortcuts-svelte`.
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
