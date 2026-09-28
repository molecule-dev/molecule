/**
 * React hooks for `@molecule/app-client-search`.
 *
 * Three headless hooks: {@link useClientSearchIndex} builds the index from a
 * list, {@link useClientSearch} keeps an input's text and its hits, and
 * {@link useListNavigation} moves through the hits with the keyboard. The app
 * renders the input and the list itself, styled with `getClassMap()`.
 *
 * @example
 * ```tsx
 * import { useClientSearch, useClientSearchIndex, useListNavigation } from '@molecule/app-client-search-react'
 *
 * function PackageSearch({ packages }: { packages: Pkg[] }) {
 *   const index = useClientSearchIndex(packages, {
 *     idField: 'name',
 *     fields: ['name', 'description', 'exports'],
 *     filterFields: ['category', 'type'],
 *     boost: { name: 3 },
 *   })
 *   const { query, setQuery, hits, active } = useClientSearch(index, { limit: 50 })
 *   const nav = useListNavigation({
 *     count: hits.length,
 *     onSelect: (i) => navigate(`/packages/${hits[i].id}`),
 *     onEscape: () => setQuery(''),
 *   })
 *   return (
 *     <>
 *       <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={nav.onKeyDown} />
 *       <ul>{hits.map((h, i) => <li key={h.id} aria-selected={i === nav.activeIndex}>{h.doc.name}</li>)}</ul>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Pass a stable list.** `useClientSearchIndex` rebuilds only when the
 *   `docs` array identity changes; a list recreated on every render (`.filter`
 *   in the render body) rebuilds the index on every keystroke. Keep it in
 *   state or `useMemo` it.
 * - **Blank text returns every document**, so the same list renders the
 *   browse state and the search state; there is no separate "no query" path
 *   to write. Check `active` when the empty state should look different.
 * - `useListNavigation` resets the highlight when the hit count changes and
 *   ignores keys with modifiers, so `Cmd+Enter` and friends stay free for the
 *   app. Wire `Enter` to real navigation (the URL changes), not just a
 *   highlight.
 * - These hooks render nothing and register no global key. Bind `/` or
 *   `Cmd+K` to focus the input through `@molecule/app-keyboard-shortcuts-react`.
 *
 * @module
 */

export * from './useClientSearch.js'
export * from './useClientSearchIndex.js'
export * from './useListNavigation.js'
