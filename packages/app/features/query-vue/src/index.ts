/**
 * Vue composables for `@molecule/app-query` — the Vue counterpart of
 * `@molecule/app-query-react`, with the same exports, the same props, the same
 * cache behavior and the same DOM for the same input.
 *
 * **Load page data with {@link useQuery}, not `fetch` inside a `watch`.** A hand-written load
 * watcher that cancels its request on cleanup (a `cancelled` flag, or an `AbortController`)
 * re-runs its cleanup on EVERY re-run whenever one of its sources is a function created inline
 * each run — `const { setError } = useApiErrors()` returning arrow functions is the usual
 * source. The watcher's own guard (`if (loaded === slug) return`) then returns without
 * refetching, so the response is discarded whenever it arrives after a re-run: always on a
 * remote server, never on localhost, which is why the page passes locally and fails on the
 * live URL. `useQuery` subscribes once per key, keeps its request stable across re-renders,
 * and aborts it only when the key changes or the component unmounts.
 *
 * {@link useQuery} observes one document from the app's shared cache and
 * returns cached data on the first read; {@link usePrefetch} and
 * {@link intentPrefetchProps} warm a document when a person is about to
 * open it. Together they make a detail page open with no loading state.
 *
 * This package needs a bonded client: install `@molecule/app-query` with a bond
 * (`@molecule/app-query-memory`, or `@molecule/app-query-tanstack`) and call the bond's
 * `setProvider(provider)` once at startup (the scaffold's `app/src/bonds/` does this).
 *
 * **Keep displayed records on the query cache.** Render `query.value.data` directly. A custom
 * mutation handler publishes its saved response with `query.setData(saved)`; every observer
 * and the next visit receive it, and subsequent refreshes still update the view. A local
 * `ref` copy hydrated only once per record hides later query answers. Editable form
 * drafts remain local until saved. Prefer {@link createQueryResource} for a complete resource;
 * its writes already publish the response and refresh its tracked collections.
 *
 * @example
 * ```ts
 * import { getClient, isHttpError } from '@molecule/app-http'
 * import { useTranslation } from '@molecule/app-vue'
 * import { defineComponent, h } from 'vue'
 * import { intentPrefetchProps, useQuery } from '@molecule/app-query-vue'
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
 * const PackageLink = defineComponent({
 *   props: { name: { type: String, required: true } },
 *   setup(props) {
 *     return () =>
 *       h(
 *         'a',
 *         { href: `/packages/${props.name}`, ...intentPrefetchProps(packageQuery(props.name)) },
 *         props.name,
 *       )
 *   },
 * })
 *
 * const PackagePage = defineComponent({
 *   props: { name: { type: String, required: true } },
 *   setup(props) {
 *     const { t } = useTranslation()
 *     // Options as a getter: a changed `name` (a new route param) moves this same
 *     // observer to the new key — React re-renders `useQuery` with new options instead.
 *     const query = useQuery<PackageDocument | null>(() => packageQuery(props.name))
 *     return () => {
 *       const { data, status } = query.value
 *       if (status === 'error') {
 *         return h('p', { role: 'alert' }, t('packages.loadFailed', undefined, { defaultValue: 'Unable to load package.' }))
 *       }
 *       if (status === 'idle' || status === 'loading') {
 *         return h('p', { role: 'status' }, t('common.loading', undefined, { defaultValue: 'Loading…' }))
 *       }
 *       if (data == null) {
 *         return h('p', {}, t('packages.notFound', undefined, { defaultValue: 'Package not found.' }))
 *       }
 *       return h('article', {}, [h('h1', {}, data.name), h('p', {}, data.description)])
 *     }
 *   },
 * })
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
 * ```ts
 * import { unwrapList } from '@molecule/app-http'
 * import { useAuth, useHttpClient, useTranslation } from '@molecule/app-vue'
 * import { computed, defineComponent, h, type PropType } from 'vue'
 * import { useQuery } from '@molecule/app-query-vue'
 *
 * interface Invoice {
 *   id: string
 *   number: string
 * }
 *
 * export const InvoiceList = defineComponent({
 *   props: {
 *     page: { type: Number, default: 1 },
 *     statusFilter: { type: String as PropType<string>, default: '' },
 *   },
 *   setup(props) {
 *     const http = useHttpClient()
 *     const { t } = useTranslation()
 *     const { status: authStatus, user } = useAuth<{ id: string }>()
 *     const query = useQuery(
 *       computed(() => {
 *         const viewer = user.value ? String(user.value.id) : 'anonymous'
 *         return authStatus.value === 'loading'
 *           ? null
 *           : {
 *               key: ['invoices', viewer, props.statusFilter, props.page],
 *               principal: viewer,
 *               keepPreviousData: true,
 *               fetch: async (signal: AbortSignal) =>
 *                 unwrapList<Invoice>(
 *                   await http.get('/api/invoices', {
 *                     signal,
 *                     params: {
 *                       status: props.statusFilter,
 *                       limit: 20,
 *                       offset: (props.page - 1) * 20,
 *                     },
 *                   }),
 *                 ),
 *             }
 *       }),
 *     )
 *
 *     // Status renders outside the item list (it is not an item), and the empty state
 *     // describes only the key on screen, never a retained previous page.
 *     return () => {
 *       const state = query.value
 *       return h('section', {}, [
 *         state.status === 'loading' || state.isFetching
 *           ? h('p', { role: 'status' }, t('common.loading', undefined, { defaultValue: 'Loading…' }))
 *           : null,
 *         state.status === 'error'
 *           ? h('p', { role: 'alert' }, t('invoices.loadFailed', undefined, { defaultValue: 'Unable to load invoices.' }))
 *           : null,
 *         h('ul', {}, (state.data ?? []).map((invoice) => h('li', { key: invoice.id }, [h('a', { href: `/invoices/${invoice.id}` }, invoice.number)]))),
 *         !state.isPreviousData && state.data?.length === 0
 *           ? h('p', {}, t('invoices.empty', undefined, { defaultValue: 'No invoices yet.' }))
 *           : null,
 *       ])
 *     }
 *   },
 * })
 * ```
 *
 * @example
 * A mutation or a failed load has to change a page that is ALREADY mounted, and
 * the cache never starts that request by itself: `set()` paints a mutation's own
 * response, `invalidate()` marks what it affects for the next mount, and an
 * explicit `fetch()` retries into the mounted page.
 *
 * ```ts
 * import { getQueryClient } from '@molecule/app-query'
 * import { getClient } from '@molecule/app-http'
 * import { t } from '@molecule/app-i18n'
 * import { defineComponent, h } from 'vue'
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
 * const Retry = defineComponent({
 *   props: { principal: { type: String, required: true } },
 *   setup(props) {
 *     return () =>
 *       h(
 *         'button',
 *         {
 *           type: 'button',
 *           onClick: () => {
 *             // invalidate() alone would leave the mounted page on its error;
 *             // an explicit fetch retries into it. useQuery shows the outcome.
 *             void getQueryClient()
 *               .fetch(feedOptions(props.principal, 'following', 1))
 *               // The mounted useQuery observer presents this failure via status/error.
 *               .catch((_error) => {})
 *           },
 *         },
 *         t('common.retry', undefined, { defaultValue: 'Retry' }),
 *       )
 *   },
 * })
 * ```
 *
 * @example
 * One API resource described once, for every page that reads or changes it.
 * `createQueryResource` returns the list and detail reads as `useQuery` options and the writes
 * as functions that put the server's record into the cache and fetch the lists on screen again,
 * so a page never mirrors a response into a local `ref`. A flag the API models as a sub-path
 * (`POST /invoices/:id/flag`, `DELETE` to clear it) is `toggle`, which resolves with the saved
 * record and is the `commit` of `useOptimisticValue`.
 *
 * ```ts
 * import { getClient, unwrapList, unwrapSingle } from '@molecule/app-http'
 * import { useAuth, useOptimisticValue, useTranslation } from '@molecule/app-vue'
 * import { defineComponent, h, type PropType } from 'vue'
 * import { createQueryResource, QueryContent, useQuery } from '@molecule/app-query-vue'
 *
 * interface Invoice {
 *   id: string
 *   number: string
 *   flagged: boolean
 * }
 *
 * export const invoices = createQueryResource<Invoice>({
 *   name: 'invoices',
 *   path: '/invoices',
 *   http: getClient,
 *   readList: (response) => unwrapList<Invoice>(response),
 *   readOne: (response) => unwrapSingle<Invoice>(response),
 * })
 *
 * const InvoicePage = defineComponent({
 *   props: { id: { type: String as PropType<string>, required: true } },
 *   setup(props) {
 *     const { user } = useAuth<{ id: string }>()
 *     const { t } = useTranslation()
 *     const query = useQuery(() => invoices.detail(user.value ? String(user.value.id) : 'anonymous', props.id))
 *     return () => {
 *       const viewer = user.value ? String(user.value.id) : 'anonymous'
 *       return h(QueryContent<Invoice | null>, {
 *         query: query.value,
 *         pending: h('p', { role: 'status' }, t('common.loading', undefined, { defaultValue: 'Loading…' })),
 *         missing: h('p', { role: 'alert' }, t('invoice.missing', undefined, { defaultValue: 'Invoice not found.' })),
 *         error: () => h('p', { role: 'alert' }, t('invoice.failed', undefined, { defaultValue: 'Unable to load invoice.' })),
 *         children: (invoice) => h(FlagButton, { key: invoice.id, invoice, viewer }),
 *       })
 *     }
 *   },
 * })
 *
 * const FlagButton = defineComponent({
 *   props: {
 *     invoice: { type: Object as PropType<Invoice>, required: true },
 *     viewer: { type: String, required: true },
 *   },
 *   setup(props) {
 *     const { t } = useTranslation()
 *     const flag = useOptimisticValue({
 *       value: props.invoice.flagged,
 *       commit: async (on) => (await invoices.toggle(props.viewer, props.invoice.id, 'flag', on)).flagged,
 *     })
 *     // While a save is pending the optimistic value leads; when it settles,
 *     // the saved record on the cache leads. That is the Vue composition of the
 *     // same behavior React gets by re-rendering `value: invoice.flagged` —
 *     // a failed save rolls back to the record the cache still holds.
 *     return () => {
 *       const flagged = flag.pending.value ? flag.value.value : props.invoice.flagged
 *       return h(
 *         'button',
 *         {
 *           type: 'button',
 *           'aria-pressed': flagged,
 *           onClick: () => flag.update((on) => !on),
 *         },
 *         [
 *           flagged
 *             ? t('invoice.unflag', undefined, { defaultValue: 'Unflag' })
 *             : t('invoice.flag', undefined, { defaultValue: 'Flag' }),
 *           ' ',
 *           props.invoice.number,
 *         ],
 *       )
 *     }
 *   },
 * })
 * ```
 *
 * @example
 * A pager needs the whole response, including its total. Keep that read on the same resource
 * as its mutations, including alternate list paths; a separate hand-written `QueryOptions`
 * is outside the resource's refresh tracking.
 *
 * ```typescript
 * import { getClient } from '@molecule/app-http'
 * import { createQueryResource } from '@molecule/app-query-vue'
 *
 * interface TicketPage { tickets: { id: string; subject: string }[]; total: number }
 * const tickets = createQueryResource<TicketPage['tickets'][number]>({
 *   name: 'tickets', path: '/tickets', http: getClient,
 *   readOne: (response) => response.data as TicketPage['tickets'][number],
 * })
 * const page = tickets.listPage('agent-1', { limit: 10, offset: 20 },
 *   (response) => response.data as TicketPage)
 * // useQuery(page) observes both rows and total. tickets.create/update/remove/toggle
 * // and tickets.refresh('agent-1') refresh this page too.
 * // A second list can use tickets.listPage(viewer, params, readPage, '/tickets/open').
 * // Use one canonical page reader per path; list() still returns only its own rows.
 * // For immediate deletion from an opaque page, add a fifth argument:
 * // (page, id) => {
 * //   const rows = page.tickets.filter((row) => String(row.id) !== id)
 * //   return { ...page, tickets: rows, total: page.total - (page.tickets.length - rows.length) }
 * // }
 * ```
 * A resource mutation also waits out a pre-mutation list request before fetching again;
 * joining that older in-flight read alone would leave the new record absent.
 * Successful deletion removes a row immediately, including one just created through the
 * resource. Stale reads cannot restore acknowledged deletions for that viewer; an explicit
 * successful create can recreate the identity. Opaque listPage envelopes need their own
 * removeFromPage adapter; no row or total property is guessed.
 *
 * @remarks
 * - **`useQuery` reads the cache synchronously on the first read.** A
 *   document prefetched from a hovered link, or seeded with `client.set()`
 *   from a server-rendered JSON island, renders at once — no spinner, no
 *   layout shift. Render loading from `status === 'idle' || status === 'loading'`;
 *   `undefined` data can also accompany a completed error. A completed `null`
 *   response is missing, not pending. The detail example treats only HTTP 404
 *   or a successful null response as missing; other errors stay load failures.
 *   The app's bonded HTTP client rejects non-2xx responses. Native `fetch`
 *   resolves them, so a custom fetcher must check `response.ok` before JSON.
 * - **Mount a detail region and its actions only after its initial document arrives.**
 *   A visible container is not a loaded document: a caller may wait for that container and
 *   read its text once, or click its button, while `data` is still undefined. Put the loading
 *   message outside the detail region, as in `PackagePage` above. Keep record-dependent
 *   controls absent or natively disabled until the record exists; returning early inside
 *   an enabled click handler loses that click. `client.set()` protects a cache mutation
 *   from an older read, but cannot recover a click whose handler never sent the mutation.
 * - **The key is the identity.** Building `options` inline is fine; the
 *   composable resubscribes only when the key's value changes, not when the
 *   `fetch` closure does.
 * - **A key change normally resets to the new key's state.** For a list's own
 *   page/filter/view change, opt into `keepPreviousData` with a `principal`;
 *   `isPreviousData` tells you the rows on screen belong to the key you just
 *   left. A completed response (including an empty list) replaces them, and a
 *   changed principal drops them, so an account switch never shows the previous
 *   account's rows. Do not emulate this with a local `ref` mirror of the
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
 *   that answers every viewer the same.
 * - **Render loading, empty and error status outside the item list**, and never
 *   give a placeholder the item's own class or element shape: a list read by
 *   the item class (or by `:first-child`) must contain only real items. An
 *   empty array is a loaded empty state, not a missing response; render it
 *   only when `isPreviousData` is not set, because a retained document belongs
 *   to the key you just left.
 * - `intentPrefetchProps` spreads three handlers onto a link. It is a plain
 *   function (not a composable), so it works inside `.map()` too. The names
 *   are Vue's listener spellings (`onPointerenter`, `onFocus`, `onTouchstart`).
 * - Prefetching respects the browser's data-saver setting and skips 2G
 *   connections (`shouldPrefetch()` in the core) — do not bypass that for
 *   "important" links; the person can still click.
 * - **Refresh a mounted document with `query.refetch()`.** It fetches even a fresh cache
 *   entry and updates every observer of that key. After a mutation whose response is not the
 *   whole document, `await query.refetch()` reloads the displayed list. It resolves with the
 *   resulting state (including `status: 'error'` on failure); a disabled query stays idle.
 *   Prefer `client.set(key, response)` when the mutation already returned the whole document.
 * - Errors are not thrown from the composable; read `status === 'error'` and
 *   `error`. `client.invalidate()` does NOT refetch a mounted page — it only
 *   marks documents stale, so the page keeps its error (or its old document)
 *   until the app retries with `client.fetch(options)` or the page subscribes
 *   again (a key change or a re-mount).
 * - After a mutation, `client.set(key, response)` paints the server's own
 *   answer at once and supersedes an older fetch already in flight for that
 *   key, so its response cannot undo the mutation. An existing `fetch()` caller
 *   still settles independently of the cache write; read `client.get(key)` for the newest document.
 *   `client.invalidate(prefix)` marks the affected reads stale for their next
 *   mount. Which key and which scope is the app's decision: the cache does not
 *   infer it from auth or form state.
 *
 * Render resource-dependent lists and controls through {@link QueryContent}. Its `children`
 * function (or default slot) receives only loaded, non-null data; loading and error content
 * never mount item actions.
 * It renders cached content during refresh and treats an empty list, false and zero as data.
 * Put the list, or the record's own container (its card, header or profile block), inside the
 * `children` and every status line (loading, error, `isFetching` refresh) beside it, never inside it:
 * a reader that finds the container and reads its paragraph must read the record, not "Loading…".
 *
 * ```ts
 * h(QueryContent, { query: query.value, pending: h('p', { role: 'status' }, loadingLabel) },
 *   // missing: h('p', {}, missingLabel), error: () => h('p', { role: 'alert' }, errorLabel),
 *   { default: ({ data: record }) => [h(RecordActions, { record })] })
 * ```
 *
 * Keep every resource identity in the query key. A boundary cannot correct a query that supplies
 * another record's cached data. For a list, map real rows inside the child; never style a status
 * placeholder as a row. QueryContent is headless and owns no translations or styling.
 *
 * @module
 */

export * from './list-query.js'
export * from './query-content.js'
export * from './resource.js'
export * from './types.js'
export * from './usePrefetch.js'
export * from './useQuery.js'
