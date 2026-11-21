/**
 * Vue search UI for `@molecule/app-client-search`.
 *
 * The Vue counterpart of `@molecule/app-search-ui-react` — the same props
 * (React names) and the same DOM for the same input. Three pieces that fit a
 * `useSearchSession` from `@molecule/app-client-search-vue`:
 * {@link SearchBox} (the field, its clear button and shortcut cap, a help icon
 * whose tooltip shows the search syntax, an `afterField` slot for the
 * consumer's own tabs, the active filter chips and the hit count),
 * {@link SearchResults} (ranked rows with the matched terms marked, hover
 * prefetch, an optional action per row; the keyboard-active row is marked with
 * `aria-current` and announced through a polite status region), and
 * {@link QuickSearchDialog} (both in a `mod+k` dialog named for screen readers
 * by its `label`, "Search" by default). Every class comes from
 * the ClassMap's search tokens (`searchField`, `resultList`, …), so a UI bond
 * restyles all of it at once.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { Link } from '@molecule/app-vue'
 * import { useSearchSession } from '@molecule/app-client-search-vue'
 * import { SearchBox, SearchResults } from '@molecule/app-search-ui-vue'
 * import { useTranslation } from '@molecule/app-vue'
 * import type { SearchResultLinkProps } from '@molecule/app-search-ui-vue'
 *
 * const Catalog = defineComponent({
 *   setup() {
 *     const { t } = useTranslation()
 *     const session = useSearchSession({
 *       docs: packages,
 *       options: PACKAGE_INDEX_OPTIONS,
 *       rememberKey: 'catalog.search',
 *       onOpen: (p) => router.push(`/packages/${p.name}`),
 *     })
 *     const renderLink = (p: SearchResultLinkProps) =>
 *       h(
 *         Link,
 *         { to: p.href, state: p.state, class: p.className, onClick: p.onClick, 'data-mol-id': p['data-mol-id'] },
 *         () => [p.children],
 *       )
 *     return () => [
 *       h(SearchBox, {
 *         value: session.query.value,
 *         onChange: session.setQuery,
 *         onKeyDown: session.onKeyDown,
 *         inputRef: session.inputRef,
 *         placeholder: t('catalog.search', undefined, { defaultValue: 'Search packages' }),
 *         count: session.hits.value.length,
 *         filters: session.parsed.value.filters,
 *         onRemoveFilter: session.removeFilter,
 *         onClear: session.clear,
 *         examples: ['category:auth', 'type:bond'],
 *       }),
 *       h(SearchResults, {
 *         hits: session.hits.value,
 *         view: (p) => ({ href: `/packages/${p.name}`, title: `@molecule/${p.name}`, description: p.description, meta: [p.type, p.category], mono: true }),
 *         activeIndex: session.activeIndex.value,
 *         onActivate: session.setActiveIndex,
 *         onOpen: session.open,
 *         onPrefetch: session.prefetch,
 *         renderLink,
 *         emptyText: t('catalog.empty', undefined, { defaultValue: 'Nothing matches' }),
 *       }),
 *     ]
 *   },
 * })
 * ```
 *
 * (`searchPlaceholder` and `nothingMatches` are the app's own translated strings.)
 *
 * @remarks
 * - **Pass a router link through `renderLink`**, or every row is a full page
 *   load: the list renders a plain `<a>` by default because it does not know
 *   your router. A plain click calls `onOpen` (which the session turns into
 *   navigation); a modified click is left to the browser so "open in new tab" works.
 * - The box does not own the text: bind `value`/`onChange` to a session (or
 *   any state) and it stays mounted, with its text, across searches. Do not
 *   remount it per search.
 * - `placeholder`, `emptyText` and the like are already-translated strings
 *   from the app; the package translates only its own chrome ("Clear
 *   search", "{{count}} results", "Search tips") through `@molecule/app-locales-search-ui`.
 * - The quick dialog needs a session created with `syncUrl: false` and
 *   `onEscape: onClose`; the page's own session keeps the URL.
 * - Node-valued props (`afterField`, `Kbd`'s `children`) arrive as a prop AND
 *   a same-named slot; components accept either.
 *
 * @module
 */

export * from './Highlight.js'
export * from './Kbd.js'
export * from './QuickSearchDialog.js'
export * from './SearchBox.js'
export * from './SearchResults.js'
export * from './types.js'
