/**
 * React search UI for `@molecule/app-client-search`.
 *
 * Three pieces that fit a `useSearchSession` from
 * `@molecule/app-client-search-react`: {@link SearchBox} (the field, its
 * clear button and shortcut cap, a help icon whose tooltip shows the search
 * syntax, an `afterField` slot for the consumer's own tabs, the active
 * filter chips and the hit count), {@link SearchResults} (ranked rows with the matched terms
 * marked, keyboard-active row, hover prefetch, an optional action per row),
 * and {@link QuickSearchDialog} (both in a `mod+k` dialog). Every class comes
 * from the ClassMap's search tokens (`searchField`, `resultList`, …), so a
 * UI bond restyles all of it at once.
 *
 * @example
 * ```tsx
 * import { useSearchSession } from '@molecule/app-client-search-react'
 * import { SearchBox, SearchResults } from '@molecule/app-search-ui-react'
 * import { useTranslation } from '@molecule/app-react'
 *
 * function Catalog({ packages }: { packages: Pkg[] }) {
 *   const navigate = useNavigate()
 *   const { t } = useTranslation()
 *   const session = useSearchSession({
 *     docs: packages,
 *     options: PACKAGE_INDEX_OPTIONS,
 *     legacyHashField: 'category',
 *     rememberKey: 'catalog.search',
 *     onOpen: (p) => navigate(`/packages/${p.name}`),
 *   })
 *   return (
 *     <>
 *       <SearchBox
 *         value={session.query}
 *         onChange={session.setQuery}
 *         onKeyDown={session.onKeyDown}
 *         inputRef={session.inputRef}
 *         placeholder={t('catalog.search', undefined, { defaultValue: 'Search packages' })}
 *         count={session.hits.length}
 *         filters={session.parsed.filters}
 *         onRemoveFilter={session.removeFilter}
 *         onClear={session.clear}
 *         examples={['category:auth', 'type:bond']}
 *       />
 *       <SearchResults
 *         hits={session.hits}
 *         view={(p) => ({ href: `/packages/${p.name}`, title: `@molecule/${p.name}`, description: p.description, meta: [p.type, p.category], mono: true })}
 *         activeIndex={session.activeIndex}
 *         onActivate={session.setActiveIndex}
 *         onOpen={session.open}
 *         onPrefetch={session.prefetch}
 *         renderLink={(p) => <Link to={p.href} state={p.state} className={p.className} onClick={p.onClick} data-mol-id={p['data-mol-id']}>{p.children}</Link>}
 *         emptyText={t('catalog.empty', undefined, { defaultValue: 'Nothing matches' })}
 *       />
 *     </>
 *   )
 * }
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
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] The field shows its placeholder and the shortcut cap; the cap goes
 *   away while typing and the × clears the text and keeps focus.
 * - [ ] A `field:value` in the text appears as a chip; its × removes only that part.
 * - [ ] Results update on every keystroke with the matched words marked; the
 *   count agrees with the rows.
 * - [ ] Arrow keys move the highlight, Enter opens the highlighted row and the
 *   URL changes; a plain click on a row does the same; Cmd/Ctrl-click opens a new tab.
 * - [ ] `mod+k` opens the dialog with focus in its field; Escape with an empty
 *   field closes it; opening a hit closes it and navigates.
 *
 * @module
 */

export * from './Highlight.js'
export * from './Kbd.js'
export * from './QuickSearchDialog.js'
export * from './SearchBox.js'
export * from './SearchResults.js'
