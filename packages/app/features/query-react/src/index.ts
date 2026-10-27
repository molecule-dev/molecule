/**
 * React hooks for `@molecule/app-query`.
 *
 * **Load page data with {@link useQuery}, not `fetch` inside a `useEffect`.** A hand-written load
 * effect that cancels its request on cleanup (a `cancelled` flag, or an `AbortController`) re-runs
 * its cleanup on EVERY re-render whenever one of its dependencies is a function created inline each
 * render — `const [messages, setError] = useApiErrors()` returning arrow functions is the usual
 * source. The effect's own guard (`if (loaded.current === slug) return`) then returns without
 * refetching, so the response is discarded whenever it arrives after a re-render: always on a
 * remote server, never on localhost, which is why the page passes locally and fails on the live URL.
 * `useQuery` subscribes once per key, keeps its request stable across re-renders, and aborts it
 * only when the key changes or the page unmounts.
 *
 * {@link useQuery} observes one document from the app's shared cache and
 * returns cached data on the first render; {@link usePrefetch} and
 * {@link intentPrefetchProps} warm a document when a person is about to
 * open it. Together they make a detail page open with no loading state.
 *
 * This package needs a bonded client: install `@molecule/app-query` with a bond
 * (`@molecule/app-query-memory`, or `@molecule/app-query-tanstack`) and call the bond's
 * `setProvider(provider)` once at startup (the scaffold's `app/src/bonds/` does this).
 *
 * @example
 * ```tsx
 * import { Link } from 'react-router'
 * import { getClient, isHttpError } from '@molecule/app-http'
 * import { t } from '@molecule/app-i18n'
 * import { intentPrefetchProps, useQuery } from '@molecule/app-query-react'
 *
 * interface PackageDocument {
 *   name: string
 *   description: string
 * }
 *
 * const packageQuery = (name: string) => ({
 *   key: ['package', name],
 *   fetch: async (signal: AbortSignal): Promise<PackageDocument | null> => {
 *     try {
 *       const response = await getClient().get<PackageDocument | null>(
 *         `/data/packages/${encodeURIComponent(name)}.json`,
 *         { signal },
 *       )
 *       return response.data
 *     } catch (error) {
 *       if (isHttpError(error) && error.status === 404) return null
 *       throw error
 *     }
 *   },
 * })
 *
 * function PackageLink({ name }: { name: string }) {
 *   return <Link to={`/packages/${name}`} {...intentPrefetchProps(packageQuery(name))}>{name}</Link>
 * }
 *
 * function PackagePage({ name }: { name: string }) {
 *   const { data, status } = useQuery(packageQuery(name))
 *   if (status === 'error') {
 *     return <p role="alert">{t('packages.loadFailed', undefined, { defaultValue: 'Unable to load package.' })}</p>
 *   }
 *   if (status === 'idle' || status === 'loading') {
 *     return <p role="status">{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p>
 *   }
 *   if (data == null) {
 *     return <p>{t('packages.notFound', undefined, { defaultValue: 'Package not found.' })}</p>
 *   }
 *   return <article><h1>{data.name}</h1><p>{data.description}</p></article>
 * }
 * ```
 *
 * @example
 * A list whose page and filter live in the URL: derive the key from the route and pass
 * `keepPreviousData` with a `principal`, so a page/filter change keeps the rows already on screen
 * until the next page answers. The app's HTTP client sends the session, so the viewer is part of
 * what the answer depends on: key on it and pass the same value as `principal` — an account
 * switch then drops the previous account's rows at once. Pass `null` while the session is still
 * being restored (`status === 'loading'`; the HTTP client holds the request until then anyway),
 * so restoring a session never swaps a key that already rendered rows.
 *
 * ```tsx
 * import { Link } from 'react-router'
 * import { unwrapList } from '@molecule/app-http'
 * import { useQuery } from '@molecule/app-query-react'
 * import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
 * import { useListRoute } from '@molecule/app-routing-react-router'
 *
 * interface Invoice {
 *   id: string
 *   number: string
 * }
 *
 * function InvoiceList() {
 *   const http = useHttpClient()
 *   const { t } = useTranslation()
 *   const { status, user } = useAuth<{ id: string }>()
 *   const list = useListRoute({ pageSize: 20, filters: { status: {} } })
 *   const viewer = user ? String(user.id) : 'anonymous'
 *   const query = useQuery(
 *     status === 'loading' || !list.canLoad
 *       ? null
 *       : {
 *           key: ['invoices', viewer, list.filters, list.page],
 *           principal: viewer,
 *           keepPreviousData: true,
 *           fetch: async (signal: AbortSignal) =>
 *             unwrapList<Invoice>(
 *               await http.get('/api/invoices', {
 *                 signal,
 *                 params: { ...list.filters, limit: list.pageSize, offset: list.offset },
 *               }),
 *             ),
 *         },
 *   )
 *
 *   // Status renders outside the item list (it is not an item), and the empty state
 *   // describes only the key on screen, never a retained previous page.
 *   return (
 *     <section>
 *       {status === 'loading' || query.isFetching ? (
 *         <p role="status">{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p>
 *       ) : null}
 *       {query.status === 'error' ? (
 *         <p role="alert">
 *           {t('invoices.loadFailed', undefined, { defaultValue: 'Unable to load invoices.' })}
 *         </p>
 *       ) : null}
 *       <ul>
 *         {query.data?.map((invoice) => (
 *           <li key={invoice.id}>
 *             <Link to={`/invoices/${invoice.id}`}>{invoice.number}</Link>
 *           </li>
 *         ))}
 *       </ul>
 *       {!query.isPreviousData && query.data?.length === 0 ? (
 *         <p>{t('invoices.empty', undefined, { defaultValue: 'No invoices yet.' })}</p>
 *       ) : null}
 *       <Link to={list.href({ page: list.page + 1 })}>
 *         {t('common.next', undefined, { defaultValue: 'Next page' })}
 *       </Link>
 *     </section>
 *   )
 * }
 * ```
 *
 * @example
 * A mutation or a failed load has to change a page that is ALREADY mounted, and
 * the cache never starts that request by itself: `set()` paints a mutation's own
 * response, `invalidate()` marks what it affects for the next mount, and an
 * explicit `fetch()` retries into the mounted page.
 *
 * ```tsx
 * import { getClient } from '@molecule/app-http'
 * import { t } from '@molecule/app-i18n'
 * import { getQueryClient } from '@molecule/app-query'
 *
 * // The key names what the document actually depends on — here the signed-in
 * // principal, the filter and the page. Another principal's feed is a
 * // different document, so an invalidation scoped to this one leaves it alone.
 * const feedKey = (principal: string, filter: string, page: number) =>
 *   ['feed', principal, filter, page] as const
 *
 * const feedOptions = (principal: string, filter: string, page: number) => ({
 *   key: feedKey(principal, filter, page),
 *   fetch: async (signal: AbortSignal) =>
 *     (await getClient().get(`/api/feeds/${filter}`, { signal, params: { page } })).data,
 * })
 *
 * async function setFollowing(principal: string, authorId: string, follow: boolean) {
 *   const client = getQueryClient()
 *   const http = getClient()
 *   const { data: body } = follow
 *     ? await http.post<{ feed: unknown }>(`/api/follows/${authorId}`)
 *     : await http.delete<{ feed: unknown }>(`/api/follows/${authorId}`)
 *   // The response IS the document: paint it now, with no second round trip.
 *   // (If it were only a count or a flag, skip set() and invalidate() instead.)
 *   client.set(feedKey(principal, 'following', 1), body.feed)
 *   // Future reads of every feed this principal owns are stale.
 *   client.invalidate(['feed', principal])
 * }
 *
 * function Retry({ principal }: { principal: string }) {
 *   return (
 *     <button
 *       onClick={() => {
 *         // invalidate() alone would leave the mounted page on its error;
 *         // an explicit fetch retries into it. useQuery shows the outcome.
 *         void getQueryClient()
 *           .fetch(feedOptions(principal, 'following', 1))
 *           // The mounted useQuery observer presents this failure via status/error.
 *           .catch((_error) => {})
 *       }}
 *     >
 *       {t('common.retry', undefined, { defaultValue: 'Retry' })}
 *     </button>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **`useQuery` reads the cache synchronously on the first render.** A
 *   document prefetched from a hovered link, or seeded with `client.set()`
 *   from a server-rendered JSON island, renders at once — no spinner, no
 *   layout shift. Render loading from `status === 'idle' || status === 'loading'`;
 *   `undefined` data can also accompany a completed error. A completed `null`
 *   response is missing, not pending. The detail example treats only HTTP 404
 *   or a successful null response as missing; other errors stay load failures.
 *   The app's bonded HTTP client rejects non-2xx responses. Native `fetch`
 *   resolves them, so a custom fetcher must check `response.ok` before JSON.
 * - **The key is the identity.** Building `options` inline is fine; the
 *   hook resubscribes only when the key's value changes, not when the
 *   `fetch` closure does.
 * - **A key change normally resets to the new key's state.** For a list's own
 *   page/filter/view change, opt into `keepPreviousData` with a `principal`;
 *   `isPreviousData` tells you the rows on screen belong to the key you just
 *   left. A completed response (including an empty list) replaces them, and a
 *   changed principal drops them, so an account switch never shows the previous
 *   account's rows. Do not emulate this with a local `useState` mirror of the
 *   query data — that mirror is what serves stale rows under a new page, or
 *   blanks the list on a re-render.
 * - **The key names the viewer whenever the answer can depend on it.** The
 *   app's HTTP client sends the session, so the server may filter or
 *   personalize even a list that guests can see (a `favorited` or `following`
 *   flag), and the cache serves a key's document to whoever observes it,
 *   across sign-in and sign-out. Key such a list on the viewer
 *   (`user ? String(user.id) : 'anonymous'`), pass the same value as
 *   `principal`, and pass `null` while the session is still being restored
 *   (`status === 'loading'`; the HTTP client holds the request until then
 *   anyway), so restoring a session never swaps a key that already rendered
 *   rows. A viewer-free key with `principal: 'public'` is only for an endpoint
 *   that answers every viewer the same. A protected `useListRoute` view also
 *   passes `null` while `canLoad` is false.
 * - **Render loading, empty and error status outside the item list**, and never
 *   give a placeholder the item's own class or element shape: a list read by
 *   the item class (or by `:first-child`) must contain only real items. An
 *   empty array is a loaded empty state, not a missing response; render it
 *   only when `isPreviousData` is not set, because a retained document belongs
 *   to the key you just left.
 * - `intentPrefetchProps` spreads three handlers onto a link. It is a plain
 *   function (not a hook), so it works inside `.map()` too.
 * - Prefetching respects the browser's data-saver setting and skips 2G
 *   connections (`shouldPrefetch()` in the core) — do not bypass that for
 *   "important" links; the person can still click.
 * - Errors are not thrown from the hook; read `status === 'error'` and
 *   `error`. `client.invalidate()` does NOT refetch a mounted page — it only
 *   marks documents stale, so the page keeps its error (or its old document)
 *   until the app retries with `client.fetch(options)` or the page subscribes
 *   again (a key change or a re-mount).
 * - After a mutation, `client.set(key, response)` paints the server's own
 *   answer at once, and `client.invalidate(prefix)` marks the affected reads
 *   stale for their next mount. Which key and which scope is the app's
 *   decision: the cache does not infer it from auth or form state.
 *
 * @module
 */

export * from './usePrefetch.js'
export * from './useQuery.js'
