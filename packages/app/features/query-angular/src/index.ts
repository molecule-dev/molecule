/**
 * Angular hooks for `@molecule/app-query` — the Angular counterpart of
 * `@molecule/app-query-react`, with the same exports, the same contracts and
 * the same rendered result for the same input.
 *
 * **Load page data with {@link useQuery}, not a hand-written load effect.** An
 * effect that cancels its own request on cleanup (a `cancelled` flag, or an
 * `AbortController`) re-runs its cleanup whenever one of its tracked
 * dependencies is a function created inline each run — and its own guard then
 * returns without refetching, so the response is discarded whenever it arrives
 * after a re-render: always on a remote server, never on localhost, which is
 * why the page passes locally and fails on the live URL. `useQuery`
 * subscribes once per key, keeps its request stable across template refreshes,
 * and aborts it only when the key changes or the component is destroyed.
 *
 * {@link useQuery} observes one document from the app's shared cache and
 * returns cached data on the first read; {@link usePrefetch} and
 * {@link intentPrefetchProps} warm a document when a person is about to open
 * it. Together they make a detail page open with no loading state.
 *
 * This package needs a bonded client: install `@molecule/app-query` with a bond
 * (`@molecule/app-query-memory`, or `@molecule/app-query-tanstack`) and call the
 * bond's `setProvider(provider)` once at startup (the scaffold's `app/src/bonds/`
 * does this). Call the hooks in an injection context — a component field
 * initializer or constructor. A component whose options change with its own
 * state passes a `Signal` of options (an `input()`/`computed()`), and every
 * change is followed on the same instance, the way React re-renders `useQuery`
 * with a new options object.
 *
 * @example
 * ```typescript
 * import { Component, OnChanges, computed, input } from '@angular/core'
 * import { useTranslation } from '@molecule/app-angular'
 * import { getClient, isHttpError } from '@molecule/app-http'
 * import { intentPrefetchProps, useQuery } from '@molecule/app-query-angular'
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
 * // A link warms its document at the first sign of intent: the handlers
 * // `intentPrefetchProps` returns are named after the DOM events an Angular
 * // template binds, so a component puts them on its host listeners.
 * @Component({
 *   selector: 'a[mol-package-link]',
 *   template: '<ng-content></ng-content>',
 *   inputs: ['name'],
 *   host: {
 *     '(pointerenter)': 'warm.pointerenter()',
 *     '(focus)': 'warm.focus()',
 *     '(touchstart)': 'warm.touchstart()',
 *   },
 * })
 * export class PackageLink implements OnChanges {
 *   name = ''
 *
 *   warm = intentPrefetchProps(packageQuery(this.name))
 *
 *   ngOnChanges(): void {
 *     this.warm = intentPrefetchProps(packageQuery(this.name))
 *   }
 * }
 *
 * // The page reads the document synchronously when it is cached (a warmed page
 * // opens with no loading state) and follows a changed name on the same
 * // instance. Until a name arrives, `null` observes nothing.
 * @Component({
 *   selector: 'mol-package-page',
 *   template: `
 *     @if (query.status === 'error') {
 *       <p role="alert">{{ t('packages.loadFailed', undefined, { defaultValue: 'Unable to load package.' }) }}</p>
 *     } @else if (query.status === 'idle' || query.status === 'loading') {
 *       <p role="status">{{ t('common.loading', undefined, { defaultValue: 'Loading…' }) }}</p>
 *     } @else if (query.data === null) {
 *       <p>{{ t('packages.notFound', undefined, { defaultValue: 'Package not found.' }) }}</p>
 *     } @else {
 *       <article><h1>{{ query.data?.name }}</h1><p>{{ query.data?.description }}</p></article>
 *     }
 *   `,
 * })
 * export class PackagePage {
 *   // The binding's t re-runs the template on a locale switch.
 *   protected readonly t = useTranslation().t
 *   readonly name = input('')
 *
 *   readonly query = useQuery<PackageDocument | null>(
 *     computed(() => (this.name() ? packageQuery(this.name()) : null)),
 *   )
 * }
 *
 * // `<a [mol-package-link][name]="next" [href]="href">{{ next }}</a>` warms the
 * // next package while the reader hovers, focuses or touches the link, so the
 * // page it opens renders from cache with no loading state.
 * ```
 *
 * @example
 * A list whose page and filter live in the URL: derive the key from the route
 * (a `computed` over the route inputs) and pass `keepPreviousData` with a
 * `principal`, so a page/filter change keeps the rows already on screen until
 * the next page answers. The app's HTTP client sends the session, so the viewer
 * is part of what the answer depends on: key on it and pass the same value as
 * `principal` — an account switch then drops the previous account's rows at
 * once. Pass `null` while the session is still being restored (`status ===
 * 'loading'`; the HTTP client holds the request until then anyway), so
 * restoring a session never swaps a key that already rendered rows.
 *
 * ```typescript
 * import { Component, computed, input } from '@angular/core'
 * import { useTranslation } from '@molecule/app-angular'
 * import { getClient, unwrapList } from '@molecule/app-http'
 * import { useQuery } from '@molecule/app-query-angular'
 *
 * interface Invoice {
 *   id: string
 *   number: string
 * }
 *
 * @Component({
 *   selector: 'mol-invoice-list',
 *   template: `
 *     @if (query.status === 'loading' || query.isFetching) {
 *       <p role="status">{{ t('common.loading', undefined, { defaultValue: 'Loading…' }) }}</p>
 *     }
 *     @if (query.status === 'error') {
 *       <p role="alert">{{ t('invoices.loadFailed', undefined, { defaultValue: 'Unable to load invoices.' }) }}</p>
 *     }
 *     <ul>
 *       @for (invoice of query.data ?? []; track invoice.id) {
 *         <li><a [href]="'/invoices/' + invoice.id">{{ invoice.number }}</a></li>
 *       }
 *     </ul>
 *     @if (!query.isPreviousData && query.data?.length === 0) {
 *       <p>{{ t('invoices.empty', undefined, { defaultValue: 'No invoices yet.' }) }}</p>
 *     }
 *     <a [href]="nextHref()">{{ t('common.next', undefined, { defaultValue: 'Next page' }) }}</a>
 *   `,
 * })
 * export class InvoiceList {
 *   // The binding's t re-runs the template on a locale switch.
 *   protected readonly t = useTranslation().t
 *   // The viewer whose invoices these are (also in the key).
 *   readonly viewer = input('anonymous')
 *   // The page to show.
 *   readonly page = input(1)
 *
 *   readonly query = useQuery<Invoice[]>(
 *     computed(() => ({
 *       key: ['invoices', this.viewer(), this.page()],
 *       principal: this.viewer(),
 *       keepPreviousData: true,
 *       fetch: async (signal: AbortSignal) =>
 *         unwrapList<Invoice>(
 *           await getClient().get('/api/invoices', {
 *             signal,
 *             params: { limit: 20, offset: (this.page() - 1) * 20 },
 *           }),
 *         ),
 *     })),
 *   )
 *
 *   readonly nextHref = computed(() => `/invoices?page=${this.page() + 1}`)
 * }
 * ```
 *
 * @example
 * A mutation or a failed load has to change a page that is ALREADY mounted, and
 * the cache never starts that request by itself: `set()` paints a mutation's own
 * response, `invalidate()` marks what it affects for the next mount, and an
 * explicit `fetch()` retries into the mounted page.
 *
 * ```typescript
 * import { Component, input } from '@angular/core'
 * import { useTranslation } from '@molecule/app-angular'
 * import { getClient } from '@molecule/app-http'
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
 * async function setFollowing(principal: string, authorId: string, follow: boolean): Promise<void> {
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
 * @Component({
 *   selector: 'button[mol-feed-retry]',
 *   template: `{{ t('common.retry', undefined, { defaultValue: 'Retry' }) }}`,
 *   host: { type: 'button', '(click)': 'retry()' },
 * })
 * export class FeedRetry {
 *   // The binding's t re-runs the template on a locale switch.
 *   protected readonly t = useTranslation().t
 *   readonly principal = input.required<string>()
 *
 *   retry(): void {
 *     // invalidate() alone would leave the mounted page on its error;
 *     // an explicit fetch retries into it. useQuery shows the outcome.
 *     void getQueryClient()
 *       .fetch(feedOptions(this.principal(), 'following', 1))
 *       .catch((_error) => {
 *         // The mounted useQuery observer presents this failure via status/error.
 *       })
 *   }
 * }
 * ```
 *
 * @example
 * One API resource described once, for every page that reads or changes it.
 * `createQueryResource` returns the list and detail reads as `useQuery` options
 * and the writes as functions that put the server's record into the cache and
 * fetch the lists on screen again, so a page never mirrors a response into
 * component state. A flag the API models as a sub-path (`POST
 * /invoices/:id/flag`, `DELETE` to clear it) is `toggle`, which resolves with
 * the saved record and is the `commit` of `OptimisticToggleButton` (from
 * `@molecule/app-ui-angular`).
 *
 * ```typescript
 * import { Component, computed, input } from '@angular/core'
 * import { useTranslation } from '@molecule/app-angular'
 * import { getClient, unwrapList, unwrapSingle } from '@molecule/app-http'
 * import { OptimisticToggleButton } from '@molecule/app-ui-angular'
 * import { createQueryResource, QueryContent, useQuery } from '@molecule/app-query-angular'
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
 *   readOne: (response) => unwrapSingle<Invoice | null>(response),
 * })
 *
 * // The record's own action: a flag control whose click shows at once, whose
 * // save follows, and whose label goes back to the server's value only when the
 * // save fails. OptimisticToggleButton takes the server value as an input, so a
 * // fresh query answer updates it after a completed save.
 * @Component({
 *   selector: 'mol-flag-control',
 *   template: `
 *     <button type="button" mol-optimistic-toggle-button [value]="invoice().flagged" [commit]="save">
 *       <span slot="activeLabel">{{ t('invoice.unflag', undefined, { defaultValue: 'Unflag' }) }}</span>
 *       <span slot="inactiveLabel">{{ t('invoice.flag', undefined, { defaultValue: 'Flag' }) }}</span>
 *       {{ invoice().number }}
 *     </button>
 *   `,
 *   imports: [OptimisticToggleButton],
 * })
 * export class InvoiceFlagControl {
 *   readonly invoice = input.required<Invoice>()
 *   readonly viewer = input.required<string>()
 *   // The binding's t re-runs the template on a locale switch.
 *   protected readonly t = useTranslation().t
 *
 *   readonly save = async (flagged: boolean): Promise<boolean> =>
 *     (await invoices.toggle(this.viewer(), this.invoice().id, 'flag', flagged)).flagged
 * }
 *
 * // Render the record's own container (here the flag control) through
 * // QueryContent: its children template runs only with a loaded, non-null
 * // document, so an action can never swallow an early click. Every status
 * // line stays beside it.
 * @Component({
 *   selector: 'mol-invoice-page',
 *   template: `
 *     <mol-query-content
 *       [query]="query"
 *       [pending]="pending"
 *       [missing]="missing"
 *       [error]="failed"
 *       [children]="content"
 *     >
 *       <ng-template #pending>
 *         <p role="status">{{ t('common.loading', undefined, { defaultValue: 'Loading…' }) }}</p>
 *       </ng-template>
 *       <ng-template #missing>
 *         <p role="alert">{{ t('invoice.missing', undefined, { defaultValue: 'Invoice not found.' }) }}</p>
 *       </ng-template>
 *       <ng-template #failed let-_error>
 *         <p role="alert">{{ t('invoice.failed', undefined, { defaultValue: 'Unable to load invoice.' }) }}</p>
 *       </ng-template>
 *       <ng-template #content let-invoice>
 *         <mol-flag-control [invoice]="invoice" [viewer]="viewer()"></mol-flag-control>
 *       </ng-template>
 *     </mol-query-content>
 *   `,
 *   imports: [QueryContent, InvoiceFlagControl],
 * })
 * export class InvoicePage {
 *   // The binding's t re-runs the template on a locale switch.
 *   protected readonly t = useTranslation().t
 *   readonly id = input('')
 *   readonly viewer = input('')
 *
 *   readonly query = useQuery(
 *     computed(() => (this.viewer() && this.id() ? invoices.detail(this.viewer(), this.id()) : null)),
 *   )
 * }
 * ```
 *
 * @example
 * A pager needs the whole response, including its total. Keep that read on the
 * same resource as its mutations, including alternate list paths; a separate
 * hand-written options object is outside the resource's refresh tracking.
 *
 * ```typescript
 * import { getClient } from '@molecule/app-http'
 * import { createQueryResource } from '@molecule/app-query-angular'
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
 * - **`useQuery` reads the cache synchronously on the first render.** A
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
 * - **The key is the identity.** Building the options inline inside a
 *   `computed` is fine; the hook resubscribes only when the key's value
 *   changes, not when the `fetch` closure does.
 * - **A key change normally resets to the new key's state.** For a list's own
 *   page/filter/view change, opt into `keepPreviousData` with a `principal`;
 *   `isPreviousData` tells you the rows on screen belong to the key you just
 *   left. A completed response (including an empty list) replaces them, and a
 *   changed principal drops them, so an account switch never shows the previous
 *   account's rows. Do not emulate this with a component-local copy of the
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
 *   that answers every viewer the same. A protected route view also passes
 *   `null` while it cannot load yet.
 * - **Render loading, empty and error status outside the item list**, and never
 *   give a placeholder the item's own class or element shape: a list read by
 *   the item class (or by `:first-child`) must contain only real items. An
 *   empty array is a loaded empty state, not a missing response; render it
 *   only when `isPreviousData` is not set, because a retained document belongs
 *   to the key you just left.
 * - `intentPrefetchProps` returns three handlers named after the DOM events an
 *   Angular template binds (`pointerenter`, `focus`, `touchstart`). It is a
 *   plain function (not a hook), so it works inside `@for` too.
 * - Prefetching respects the browser's data-saver setting and skips 2G
 *   connections (`shouldPrefetch()` in the core) — do not bypass that for
 *   "important" links; the person can still click.
 * - **Refresh a mounted document with `query.refetch()`.** It fetches even a fresh cache
 *   entry and updates every observer of that key. After a mutation whose response is not the
 *   whole document, `await query.refetch()` reloads the displayed list. It resolves with the
 *   resulting state (including `status: 'error'` on failure); a disabled query stays idle.
 *   Prefer `client.set(key, response)` when the mutation already returned the whole document.
 * - Errors are not thrown from the hook; read `status === 'error'` and
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
 * - The result's state fields are signals read through plain properties
 *   (`query.data`, `query.isPreviousData`), so a template binding that reads
 *   them re-renders when the document changes, and the object can be handed to
 *   `QueryContent`'s `query` input unchanged.
 *
 * Render resource-dependent lists and controls through {@link QueryContent}. Its children
 * template receives only loaded, non-null data; loading and error content never mount item
 * actions. It renders cached content during refresh and treats an empty list, false and zero
 * as data. Put the list, or the record's own container (its card, header or profile block),
 * inside the children template and every status line (loading, error, `isFetching` refresh)
 * beside it, never inside it: a reader that finds the container and reads its paragraph must
 * read the record, not "Loading…".
 *
 * Keep every resource identity in the query key. A boundary cannot correct a query that supplies
 * another record's cached data. For a list, map real rows inside the children template; never
 * style a status placeholder as a row.
 *
 * @module
 */

export * from './list-query.js'
export * from './query-content.component.js'
export * from './resource.js'
export * from './types.js'
export * from './use-prefetch.js'
export * from './use-query.js'
