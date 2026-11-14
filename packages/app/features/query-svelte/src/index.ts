/**
 * Svelte hooks for `@molecule/app-query` — the Svelte counterpart of
 * `@molecule/app-query-react`, with the same props and the same DOM: read a
 * cached document synchronously, observe it, and prefetch on intent.
 *
 * **Load page data with {@link useQuery}, not `fetch` inside an effect.** A hand-written
 * load effect that cancels its request on cleanup re-runs that cleanup whenever one of its
 * dependencies is a function created inline each render, and then discards the response whenever
 * it arrives after one — always on a remote server, never on localhost, which is why the page
 * passes locally and fails on the live URL. `useQuery` subscribes once per key, keeps its request
 * stable across updates, and aborts it only when the key changes or the component is destroyed.
 *
 * {@link useQuery} observes one document from the app's shared cache and
 * delivers cached data on the first read; {@link usePrefetch} and
 * {@link intentPrefetchProps} warm a document when a person is about to open
 * it. Together they make a detail page open with no loading state.
 *
 * This package needs a bonded client: install `@molecule/app-query` with a bond
 * (`@molecule/app-query-memory`, or `@molecule/app-query-tanstack`) and call the bond's
 * `setProvider(provider)` once at startup (the scaffold's `app/src/bonds/` does this).
 *
 * @example
 * A detail page: the document is fetched once per key, cached documents paint at once, and only
 * an HTTP 404 or a completed `null` is "missing" — other errors stay load failures.
 *
 * ```svelte
 * <script lang="ts">
 *   import { isHttpError, getClient } from '@molecule/app-http'
 *   import { useTranslation } from '@molecule/app-svelte'
 *   import { intentPrefetchProps, useQuery } from '@molecule/app-query-svelte'
 *
 *   interface PackageDocument {
 *     name: string
 *     description: string
 *   }
 *
 *   const packageQuery = (name: string) => ({
 *     key: ['package', name],
 *     fetch: async (signal: AbortSignal): Promise<PackageDocument | null> => {
 *       try {
 *         const response = await getClient().get<PackageDocument | null>(
 *           `/data/packages/${encodeURIComponent(name)}.json`,
 *           { signal },
 *         )
 *         return response.data
 *       } catch (error) {
 *         if (isHttpError(error) && error.status === 404) return null
 *         throw error
 *       }
 *     },
 *   })
 *
 *   let { name } = $props()
 *   const { t } = useTranslation()
 *   const query = useQuery(packageQuery(name))
 * </script>
 *
 * {#if $query.status === 'error'}
 *   <p role="alert">{t('packages.loadFailed', undefined, { defaultValue: 'Unable to load package.' })}</p>
 * {:else if $query.status === 'idle' || $query.status === 'loading'}
 *   <p role="status">{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p>
 * {:else if $query.data == null}
 *   <p>{t('packages.notFound', undefined, { defaultValue: 'Package not found.' })}</p>
 * {:else}
 *   <article><h1>{$query.data.name}</h1><p>{$query.data.description}</p></article>
 * {/if}
 *
 * <a href={`/packages/${name}`} {...intentPrefetchProps(packageQuery(name))}>{name}</a>
 * ```
 *
 * @example
 * A list whose page and filter live in the URL: derive the key from the route and pass
 * `keepPreviousData` with a `principal`, so a page/filter change keeps the rows already on screen
 * until the next page answers. Key the list on the viewer and pass the same value as `principal`
 * — an account switch then drops the previous account's rows at once. Pass `null` while the
 * session is still being restored, so restoring a session never swaps a key that already
 * rendered rows. The options arrive as a readable store, so a changed page or filter
 * re-observes on the same component.
 *
 * ```svelte
 * <script lang="ts">
 *   import { derived } from 'svelte/store'
 *   import { unwrapList } from '@molecule/app-http'
 *   import { useTranslation } from '@molecule/app-svelte'
 *   import { useQuery } from '@molecule/app-query-svelte'
 *   import { useAuth, useHttpClient, useListRoute } from '@molecule/app-svelte'
 *
 *   interface Invoice {
 *     id: string
 *     number: string
 *   }
 *
 *   const http = useHttpClient()
 *   const { t } = useTranslation()
 *   const auth = useAuth<{ id: string }>()
 *   const list = useListRoute({ pageSize: 20, filters: { status: {} } })
 *   const viewer = $derived($auth.user ? String($auth.user.id) : 'anonymous')
 *   const query = useQuery(
 *     derived(list.page, (page) => ({
 *       key: ['invoices', viewer, $list.filters, page],
 *       principal: viewer,
 *       keepPreviousData: true,
 *       fetch: async (signal: AbortSignal) =>
 *         unwrapList<Invoice>(
 *           await http.get('/api/invoices', {
 *             signal,
 *             params: { ...$list.filters, limit: $list.pageSize, offset: $list.offset },
 *           }),
 *         ),
 *     })),
 *   )
 * </script>
 *
 * <section>
 *   {#if $query.status === 'loading' || $query.isFetching}
 *     <p role="status">{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p>
 *   {/if}
 *   {#if $query.status === 'error'}
 *     <p role="alert">{t('invoices.loadFailed', undefined, { defaultValue: 'Unable to load invoices.' })}</p>
 *   {/if}
 *   <ul>
 *     {#each $query.data ?? [] as invoice (invoice.id)}
 *       <li><a href={`/invoices/${invoice.id}`}>{invoice.number}</a></li>
 *     {/each}
 *   </ul>
 *   {#if !$query.isPreviousData && $query.data?.length === 0}
 *     <p>{t('invoices.empty', undefined, { defaultValue: 'No invoices yet.' })}</p>
 *   {/if}
 *   <a href={$list.href({ page: $list.page + 1 })}>
 *     {t('common.next', undefined, { defaultValue: 'Next page' })}
 *   </a>
 * </section>
 * ```
 *
 * @example
 * A mutation or a failed load has to change a page that is ALREADY mounted, and
 * the cache never starts that request by itself: `set()` paints a mutation's own
 * response, `invalidate()` marks what it affects for the next mount, and an
 * explicit `fetch()` retries into the mounted page.
 *
 * ```svelte
 * <script lang="ts">
 *   import { getClient } from '@molecule/app-http'
 *   import { getQueryClient } from '@molecule/app-query'
 *
 *   // The key names what the document actually depends on — here the signed-in
 *   // principal, the filter and the page. Another principal's feed is a
 *   // different document, so an invalidation scoped to this one leaves it alone.
 *   const feedKey = (principal: string, filter: string, page: number) =>
 *     ['feed', principal, filter, page] as const
 *
 *   const feedOptions = (principal: string, filter: string, page: number) => ({
 *     key: feedKey(principal, filter, page),
 *     fetch: async (signal: AbortSignal) =>
 *       (await getClient().get(`/api/feeds/${filter}`, { signal, params: { page } })).data,
 *   })
 *
 *   async function setFollowing(principal: string, authorId: string, follow: boolean) {
 *     const client = getQueryClient()
 *     const http = getClient()
 *     const { data: body } = follow
 *       ? await http.post<{ feed: unknown }>(`/api/follows/${authorId}`)
 *       : await http.delete<{ feed: unknown }>(`/api/follows/${authorId}`)
 *     // The response IS the document: paint it now, with no second round trip.
 *     client.set(feedKey(principal, 'following', 1), body.feed)
 *     // Future reads of every feed this principal owns are stale.
 *     client.invalidate(['feed', principal])
 *   }
 * </script>
 * ```
 *
 * @example
 * One API resource described once, for every page that reads or changes it.
 * `createQueryResource` returns the list and detail reads as `useQuery` options and the writes
 * as functions that put the server's record into the cache and fetch the lists on screen again,
 * so a page never mirrors a response into local state. A flag the API models as a sub-path
 * (`POST /invoices/:id/flag`, `DELETE` to clear it) is `toggle`, which resolves with the saved
 * record and is the `commit` of `OptimisticToggleButton` (or of `useOptimisticValue` from
 * `@molecule/app-svelte` for custom controls). Render resource-dependent lists and controls
 * through {@link QueryContent}: its child snippet receives only loaded, non-null data, so
 * loading and error content never mount item actions.
 *
 * ```svelte
 * <!-- InvoicePage.svelte -->
 * <script module lang="ts">
 *   import { getClient, unwrapList, unwrapSingle } from '@molecule/app-http'
 *   import { createQueryResource } from '@molecule/app-query-svelte'
 *
 *   interface Invoice {
 *     id: string
 *     number: string
 *     flagged: boolean
 *   }
 *
 *   // The list and detail reads are useQuery options; the writes paint the
 *   // server's own record and refresh the lists on screen.
 *   export const invoices = createQueryResource<Invoice>({
 *     name: 'invoices',
 *     path: '/invoices',
 *     http: getClient,
 *     readList: (response) => unwrapList<Invoice>(response),
 *     readOne: (response) => unwrapSingle<Invoice>(response),
 *   })
 * </script>
 *
 * <script lang="ts">
 *   import { QueryContent, useQuery } from '@molecule/app-query-svelte'
 *   import { OptimisticToggleButton } from '@molecule/app-ui-svelte'
 *   import { useTranslation } from '@molecule/app-svelte'
 *
 *   let { id }: { id: string } = $props()
 *   const { t } = useTranslation()
 *   const viewer = 'reader'
 *   const query = useQuery(invoices.detail(viewer, id))
 * </script>
 *
 * <QueryContent query={query}>
 *   {#snippet pending()}
 *     <p role="status">{t('common.loading', undefined, { defaultValue: 'Loading…' })}</p>
 *   {/snippet}
 *   {#snippet missing()}
 *     <p role="alert">{t('invoice.missing', undefined, { defaultValue: 'Invoice not found.' })}</p>
 *   {/snippet}
 *   {#snippet children(invoice)}
 *     <!-- Mounted only with the loaded record. The change shows at once and
 *       saves in order; `toggle` waits out older list reads, and an inverse
 *       click during that interval queues after the running save. -->
 *     <OptimisticToggleButton
 *       value={invoice.flagged}
 *       commit={async (on) => (await invoices.toggle(viewer, invoice.id, 'flag', on)).flagged}
 *       activeLabel={t('invoice.unflag', undefined, { defaultValue: 'Unflag' })}
 *       inactiveLabel={t('invoice.flag', undefined, { defaultValue: 'Flag' })}
 *     />
 *   {/snippet}
 * </QueryContent>
 * ```
 *
 * @remarks
 * - **`useQuery` reads the cache synchronously on the first read.** A
 *   document prefetched from a hovered link, or seeded with `client.set()`,
 *   renders at once — no spinner, no layout shift. Render loading from
 *   `status === 'idle' || status === 'loading'`; `undefined` data can also
 *   accompany a completed error. A completed `null` response is missing, not
 *   pending. The app's bonded HTTP client rejects non-2xx responses. Native
 *   `fetch` resolves them, so a custom fetcher must check `response.ok`
 *   before JSON.
 * - **Pass the options as a readable store when they change on a live
 *   component** — a route param, a session id, a page number:
 *   `useQuery(storeOfOptions)` follows a changed key on the same component,
 *   the way React re-renders `useQuery` with new options.
 * - **Mount a detail region and its actions only after its initial document
 *   arrives.** A visible container is not a loaded document: a caller may wait
 *   for that container and read its text once, or click its button, while
 *   `data` is still undefined. Put the loading message outside the detail
 *   region, and keep record-dependent controls absent until the record exists.
 * - **The key is the identity.** Building `options` inline is fine; the hook
 *   resubscribes only when the key's value changes, not when the `fetch`
 *   closure does.
 * - **A key change normally resets to the new key's state.** For a list's own
 *   page/filter/view change, opt into `keepPreviousData` with a `principal`;
 *   `isPreviousData` tells you the rows on screen belong to the key you just
 *   left. A completed response (including an empty list) replaces them, and a
 *   changed principal drops them, so an account switch never shows the previous
 *   account's rows. Do not emulate this with a local copy of the query data.
 * - **Render loading, empty and error status outside the item list**, and never
 *   give a placeholder the item's own class or element shape. An empty array is
 *   a loaded empty state, not a missing response; render it only when
 *   `isPreviousData` is not set.
 * - `intentPrefetchProps` spreads three Svelte event handlers onto a link. It
 *   is a plain function (not a hook), so it works inside `{#each}` too.
 * - Prefetching respects the browser's data-saver setting and skips 2G
 *   connections (`shouldPrefetch()` in the core) — do not bypass that for
 *   "important" links; the person can still click.
 * - **Refresh a mounted document with `query.refetch()`.** It fetches even a
 *   fresh cache entry and updates every observer of that key. After a mutation
 *   whose response is not the whole document, `await query.refetch()` reloads
 *   the displayed list. It resolves with the resulting state (including
 *   `status: 'error'` on failure); a disabled query stays idle. Prefer
 *   `client.set(key, response)` when the mutation already returned the whole
 *   document.
 * - Errors are not thrown from the hook; read `status === 'error'` and
 *   `error`. `client.invalidate()` does NOT refetch a mounted page — it only
 *   marks documents stale, so the page keeps its error (or its old document)
 *   until the app retries with `client.fetch(options)` or the page subscribes
 *   again (a key change or a re-mount).
 * - After a mutation, `client.set(key, response)` paints the server's own
 *   answer at once and supersedes an older fetch already in flight for that
 *   key, so its response cannot undo the mutation.
 * - Keep every resource identity in the query key. A boundary cannot correct a
 *   query that supplies another record's cached data. QueryContent is headless
 *   and owns no translations or styling.
 *
 * @module
 */

export * from './components.js'
export * from './list-query.js'
export * from './resource.js'
export * from './types.js'
export * from './usePrefetch.js'
export * from './useQuery.js'
