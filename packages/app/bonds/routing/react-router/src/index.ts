/**
 * React Router (v7/v8) provider for `@molecule/app-routing`.
 *
 * This package provides a React Router implementation of the molecule Router interface,
 * allowing you to use molecule's routing abstractions with React Router.
 *
 * **Paginated or filtered page? Use `useListRoute` for its URL state.** It reads
 * page, filters and selected views from the current URL; builds links that retain
 * the current path/filters; and resets page when a filter or view changes. Declare
 * path variants explicitly instead of translating API filters into browser URLs.
 * It works under ordinary `BrowserRouter` without a data router or an extra provider.
 *
 * @example
 * ```tsx
 * import { BrowserRouter, Routes, Route } from 'react-router'
 * import { MoleculeRouterProvider } from '@molecule/app-routing-react-router'
 *
 * function App() {
 *   // MoleculeRouterProvider bonds the adapter automatically (calls setRouter in an
 *   // effect on mount), so @molecule/app-routing's navigate()/getRouter() drive THIS
 *   // real React Router — no manual setRouter wiring needed.
 *   return (
 *     <BrowserRouter>
 *       <MoleculeRouterProvider>
 *         <Routes>
 *           <Route path="/" element={<Home />} />
 *           <Route path="/users/:id" element={<UserProfile />} />
 *         </Routes>
 *       </MoleculeRouterProvider>
 *     </BrowserRouter>
 *   )
 * }
 * ```
 *
 * @example
 * A list with query-selected views. The public URL remains public after login;
 * a protected view waits for session restoration. Include the signed-in principal
 * in the data key so one user's cached response cannot appear for another user.
 *
 * ```tsx
 * import { Link } from 'react-router'
 * import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
 * import { unwrapList } from '@molecule/app-http'
 * import { useQuery } from '@molecule/app-query-react'
 * import { useListRoute } from '@molecule/app-routing-react-router'
 *
 * interface Entry { id: string; title: string }
 *
 * function ActivityList() {
 *   const { status, user } = useAuth<{ id: string }>()
 *   const http = useHttpClient()
 *   const { t } = useTranslation()
 *   const list = useListRoute({
 *     pageSize: 10,
 *     filters: { category: { query: 'category' }, sort: { defaultValue: 'recent' } },
 *     selections: {
 *       public: { path: '/activity', query: { view: undefined } },
 *       personal: { path: '/activity', query: { view: 'personal' }, requiresAuth: true },
 *     },
 *     auth: { status, redirectTo: '/sign-in' },
 *   })
 *   const entries = useQuery(list.canLoad ? {
 *     key: ['activity', user?.id ?? 'anonymous', list.selection, list.filters, list.page],
 *     fetch: async (signal) => unwrapList<Entry>(await http.get('/api/activity', {
 *       signal,
 *       params: { ...list.filters, view: list.selection, limit: list.pageSize, offset: list.offset },
 *     })),
 *   } : null)
 *   return <>
 *     <Link to={list.href({ selection: 'public' })}>
 *       {t('activity.public', undefined, { defaultValue: 'Public activity' })}
 *     </Link>
 *     {user && <Link to={list.href({ selection: 'personal' })}>
 *       {t('activity.personal', undefined, { defaultValue: 'Your activity' })}
 *     </Link>}
 *     <select value={list.filters.sort} onChange={(event) => list.setFilters({ sort: event.target.value })}>
 *       <option value="recent">{t('activity.recent', undefined, { defaultValue: 'Recent' })}</option>
 *       <option value="oldest">{t('activity.oldest', undefined, { defaultValue: 'Oldest' })}</option>
 *     </select>
 *     {entries.data?.map((entry) => <p key={entry.id}>{entry.title}</p>)}
 *     <Link to={list.href({ page: list.page + 1 })}>
 *       {t('activity.next', undefined, { defaultValue: 'Next page' })}
 *     </Link>
 *   </>
 * }
 * ```
 *
 * @example
 * Path-selected views and path-backed filters use the same hook. The browser route
 * contract determines the URL; API filters can be derived separately from `params`.
 *
 * ```tsx
 * // Mount the same page on /members/:member and /members/:member/saved.
 * const list = useListRoute({
 *   selections: {
 *     authored: { path: '/members/:member' },
 *     saved: { path: '/members/:member/saved' },
 *   },
 * })
 * // <Link to={list.href({ selection: 'saved' })}>…</Link> retains :member.
 * // list.href({ page: 2 }) stays on /members/:member/saved?page=2.
 * // Use list.params.member in the API request; it is not another query key.
 *
 * // On /topics/:topic, changing page keeps the encoded topic in the path.
 * const topics = useListRoute({
 *   path: '/topics/:topic',
 *   filters: { topic: { param: 'topic' }, sort: { defaultValue: 'recent' } },
 * })
 * // topics.setFilters({ topic: 'type systems' }) changes the path and resets page.
 * // PaginationBar can use page={topics.page}, pageSize={topics.pageSize},
 * // onPageChange={topics.setPage}; custom links use topics.href({ page: next }).
 * ```
 *
 * @remarks
 * - `useListRoute` derives state from the URL on every render, including Back/Forward.
 *   Do not mirror selection/page in local state or rewrite an explicit public view
 *   when auth changes. Auth redirects replace the protected history entry only after
 *   a confirmed `unauthenticated` status; `loading` and `unavailable` remain in place.
 * - Pass `null` to `useQuery` when `list.canLoad` is false. Public views stay ready;
 *   protected views do not fall back to a public request while auth is unresolved.
 * - A selection's `query` owns only its configured keys. `undefined` means absent;
 *   unrelated query values and the hash survive pagination and selection changes.
 *   Filter/selection changes reset page one atomically, unless `page` is explicit.
 * - `useListRoute` does not call React Router's `useNavigation`: that hook needs a
 *   data router and throws under `BrowserRouter`. Use the data query's `isFetching`
 *   for list loading. No UI library, CSS class map, or data cache is required by the hook.
 * - **`MoleculeRouterProvider` bonds the router for you.** On mount it calls
 *   `@molecule/app-routing`'s `setRouter` with the live adapter, so other molecule
 *   packages' `navigate()`/`getRouter()` drive React Router (real SPA navigation) —
 *   no manual wiring. Pass `onRouterReady` only if you also need the router instance
 *   (e.g. to register guards); bonding happens either way.
 * - **Do NOT wire the exported `provider` const** in a React Router app — it is a
 *   no-hooks fallback (empty params, `window.location.href` navigation). Use
 *   `MoleculeRouterProvider` (or `createReactRouter` with hook values) instead.
 * - The provider must live INSIDE `<BrowserRouter>` (it calls React Router hooks).
 * - **Import from `'react-router'`, never `'react-router-dom'`.** The `-dom`
 *   package was discontinued after v7 (it was only a re-export shim); every API
 *   (`BrowserRouter`, `Routes`, `Route`, `Link`, hooks) lives in `react-router`.
 *
 * @module @molecule/app-routing-react-router
 */

export * from './hooks.js'
export * from './list-types.js'
export * from './provider.js'
export * from './types.js'
export * from './useListRoute.js'
export * from './utilities.js'
