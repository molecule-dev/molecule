/**
 * React hooks for `@molecule/app-query`.
 *
 * {@link useQuery} observes one document from the app's shared cache and
 * returns cached data on the first render; {@link usePrefetch} and
 * {@link intentPrefetchProps} warm a document when a person is about to
 * open it. Together they make a detail page open with no loading state.
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
