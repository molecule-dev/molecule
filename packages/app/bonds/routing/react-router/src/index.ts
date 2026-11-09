/**
 * React Router (v7/v8) provider for `@molecule/app-routing`.
 *
 * This package provides a React Router implementation of the molecule Router interface,
 * allowing you to use molecule's routing abstractions with React Router.
 *
 * `useMoleculeRouter`, `useMoleculeQuery`, `useMoleculeNavigate`, and `useIsActive`
 * work inside any React Router router (BrowserRouter, HashRouter, MemoryRouter,
 * Router, or RouterProvider), from this package or React Router itself. No
 * MoleculeRouterProvider is required for these hooks. Mount MoleculeRouterProvider
 * only to bond the adapter for non-React `@molecule/app-routing` navigate()/getRouter(),
 * supply named routes, or receive onRouterReady. Hook-created adapters remain local
 * so multiple consumers cannot overwrite the global router bond.
 *
 * **Paginated or filtered page? Use `useListRoute` for its URL state.** It reads
 * page, filters and selected views from the current URL; builds links that retain
 * the current path/filters; and resets page when a filter or view changes.
 * Start with `const pages = useListRoute()`; `filters` and `selections` are optional.
 * On `/category/books` matched by `/category/:slug`, `pages.href({ page: 2 })` is
 * `/category/books?page=2` and `pages.params.slug` is `'books'`. The route's path
 * params need no extra config and never become duplicate query filters. On
 * `/?view=mine`, the same call is `/?view=mine&page=2`: existing query keys keep
 * their order, with page last. Page one omits `page`; unrelated queries and hash
 * survive. Add `path` when changing path params, or `selections` when linking views.
 * It works under ordinary `BrowserRouter` without a data router or an extra provider.
 *
 * @example
 * ```tsx
 * import { Routes, Route } from 'react-router'
 * import { BrowserRouter, MoleculeRouterProvider } from '@molecule/app-routing-react-router'
 *
 * function App() {
 *   // Optional: include this provider for non-React navigation or named routes.
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
 * in the data key so one user's cached response cannot appear for another user, and
 * pass `null` while the session is still restoring (`status === 'loading'`) — the
 * auth gate holds the request until then anyway, so waiting for it costs nothing.
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
 *   const entries = useQuery(list.canLoad && status !== 'loading' ? {
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
 * @example
 * One feed page on `/`, `/?view=following` and `/topics/:topic`: mount it on both routes
 * with ONE config, so every tab link comes from `href`. With a separate config per route,
 * the topic page cannot build the "all" link, and a hand-written one tends to keep the topic.
 *
 * ```tsx
 * const feed = useListRoute({
 *   pageSize: 10,
 *   selections: {
 *     all: { path: '/', query: { view: undefined } },
 *     following: { path: '/', query: { view: 'following' } },
 *     topic: { path: '/topics/:topic' },
 *   },
 *   defaultSelection: 'all',
 * })
 * // On /topics/design?page=2: feed.selection is 'topic', feed.params.topic is 'design',
 * // feed.href({ selection: 'all' }) is '/', feed.href({ page: 3 }) is '/topics/design?page=3'.
 * // A topic link names its topic: feed.href({ selection: 'topic', params: { topic: name } }).
 * ```
 *
 * @remarks
 * - `useListRoute` derives state from the URL on every render, including Back/Forward.
 *   Do not mirror selection/page in local state or rewrite an explicit public view
 *   when auth changes. Auth redirects replace the protected history entry only after
 *   a confirmed `unauthenticated` status; `loading` and `unavailable` remain in place.
 * - Pass `null` to `useQuery` when `list.canLoad` is false **or** while the session
 *   is still restoring (`status === 'loading'`). Public views stay ready; protected
 *   views do not fall back to a public request while auth is unresolved.
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
 * - The provider must live INSIDE a React Router router (it calls React Router hooks).
 * - **Import router components from this bond, never directly from React Router.**
 *   Its wrappers turn transitions off, so a navigation renders the new route in the
 *   same commit as the URL change. Import non-router APIs (`Routes`, `Route`, `Link`,
 *   hooks) from `'react-router'`. A DOM data router's `RouterProvider` and the
 *   framework-mode `HydratedRouter` come from `@molecule/app-routing-react-router/dom`.
 * - **Declare pages loaded on demand with `lazyPage`, not `React.lazy`.** Each page then
 *   has a Suspense boundary of its own, so navigating to a page whose code is still
 *   loading removes the previous page at once. Under one shared `<Suspense>` around
 *   `<Routes>`, React keeps the previous page mounted (hidden) until the new code
 *   arrives, while the URL already names the new page.
 *
 * @module @molecule/app-routing-react-router
 */

export * from './hooks.js'
export * from './lazyPage.js'
export * from './list-types.js'
export * from './provider.js'
export * from './routers.js'
export type {
  GuardResult,
  NavigateOptions,
  NavigationGuard,
  QueryParams,
  ReactRouterConfig,
  ReactRouterHooks,
  RouteChangeListener,
  RouteDefinition,
  RouteLocation,
  RouteMatch,
  RouteParams,
  RouterConfig,
} from './types.js'
export * from './useListRoute.js'
export * from './utilities.js'
