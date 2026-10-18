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
 *   `error`. A refetch after an error is one more subscription (a re-mount
 *   or a key change) or a `client.invalidate()`.
 *
 * @module
 */

export * from './usePrefetch.js'
export * from './useQuery.js'
