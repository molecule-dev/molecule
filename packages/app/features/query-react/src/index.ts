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
 * import { intentPrefetchProps, useQuery } from '@molecule/app-query-react'
 *
 * const packageQuery = (name: string) => ({
 *   key: ['package', name],
 *   fetch: (signal: AbortSignal) =>
 *     fetch(`/data/packages/${name}.json`, { signal }).then((r) => r.json()),
 * })
 *
 * function PackageLink({ name }: { name: string }) {
 *   return <Link to={`/packages/${name}`} {...intentPrefetchProps(packageQuery(name))}>{name}</Link>
 * }
 *
 * function PackagePage({ name }: { name: string }) {
 *   const { data, status } = useQuery(packageQuery(name))
 *   if (!data) return status === 'error' ? <NotFound /> : <Skeleton />
 *   return <Article doc={data} />
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
 *   fetch: (signal: AbortSignal) =>
 *     fetch(`/api/feeds/${filter}?page=${page}`, { signal }).then((r) => r.json()),
 * })
 *
 * async function setFollowing(principal: string, authorId: string, follow: boolean) {
 *   const client = getQueryClient()
 *   const res = await fetch(`/api/follows/${authorId}`, { method: follow ? 'POST' : 'DELETE' })
 *   const body = await res.json()
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
 *           .catch(() => {})
 *       }}
 *     >
 *       Retry
 *     </button>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **`useQuery` reads the cache synchronously on the first render.** A
 *   document prefetched from a hovered link, or seeded with `client.set()`
 *   from a server-rendered JSON island, renders at once — no spinner, no
 *   layout shift. Render a loading state only when `data` is `undefined`.
 * - **The key is the identity.** Building `options` inline is fine; the
 *   hook resubscribes only when the key's value changes, not when the
 *   `fetch` closure does.
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
