/**
 * Client-side query cache core interface for molecule.dev.
 *
 * One in-memory cache of documents the app fetches — a package page, a
 * profile, a list — keyed by value, read synchronously, warmed ahead of a
 * navigation, and observed by components. Bond a provider (e.g.
 * `@molecule/app-query-tanstack`) at startup, then use
 * {@link getQueryClient} anywhere; `@molecule/app-query-react` adds the hooks.
 * A query with `keepPreviousData: true` must provide `principal`. The type rejects a missing
 * principal before an observer can fail at runtime. Pass the viewer's stable ID (also in the
 * query key), or `'public'` when the response is identical for every viewer.
 *
 * **For a contract-backed app, use the generated client in `src/resources/`.**
 * `mlcl resources --contract <path>` generates the supported client for the
 * routes in that contract. Import its named reads, writes and record views.
 * They use the bonded auth session automatically, pause reads while it settles,
 * and share a public cache when there is no auth bond. A successful write
 * publishes the saved detail or deletion and refetches up to four recently
 * read lists for that resource and session. Query failures appear in `error`,
 * and writes reject with the original HTTP error. Use the generated
 * `<record>ErrorMessage(error)` helper to display the contract's validation
 * message or a generic fallback.
 *
 * @example
 * ```typescript
 * import { getClient } from '@molecule/app-http'
 * import { getQueryClient, setProvider } from '@molecule/app-query'
 * import { provider } from '@molecule/app-query-tanstack'
 *
 * setProvider(provider)
 *
 * const packageQuery = (name: string) => ({
 *   key: ['package', name],
 *   fetch: async (signal: AbortSignal) =>
 *     (await getClient().get(`/data/packages/${encodeURIComponent(name)}.json`, { signal })).data,
 * })
 *
 * const client = getQueryClient()
 * client.prefetch(packageQuery('api-auth'))          // on hover: warm it
 * const doc = client.get(['package', 'api-auth'])     // later, synchronously
 * await client.fetch(packageQuery('api-auth'))        // or wait for it
 * client.invalidate(['package'])                      // every package is stale now
 * ```
 *
 * @remarks
 * - **A relationship modeled as POST to enable and DELETE to disable already has a client:**
 *   `createQueryResource(config).toggle(viewer, id, action, desired)` sends POST for `true`
 *   and DELETE for `false`, then returns the server's saved record. `desired` is the value
 *   wanted AFTER the request. Record writes require a nonempty ID and reject a missing ID
 *   before dispatch. Mount the action with an identified record from the detail query.
 *   A boolean PUT/PATCH body or an API with different action
 *   semantics uses `update()` or its own explicit adapter instead.
 *   ```typescript
 *   const members = createQueryResource<Member>({
 *     name: 'members', path: '/members', id: 'username', http: getClient,
 *     readOne: (response) => (response.data as { member: Member }).member,
 *   })
 *   const saved = await members.toggle(viewerId, username, 'watch', desired)
 *   // Return saved.watching from a boolean control's commit; use the saved record
 *   // with useOptimisticValue when the flag has a related count. A reload reads
 *   // the persisted server answer, so test both directions and revisit the page.
 *   ```
 *   Resource mutations publish the saved detail and refresh that viewer's tracked
 *   lists, including mounted observers. A raw HTTP write does not publish its
 *   response into this cache. `invalidate(key)` only marks reads stale; it does
 *   not refresh a page already on screen. Use the resource mutation, or explicitly
 *   `set` its canonical response and `fetch` each affected query for a custom API.
 *   A page-local `onChanged` callback is unnecessary when the resource owns the write.
 * - `createQueryResource().list()` owns a collection of records addressed by their URL id.
 *   It keeps the first occurrence of each identity on fetched and explicitly set lists;
 *   equal labels on different records and rows without an id remain intact. Resource writes
 *   already refresh these lists: render the query directly after awaiting `create`, without
 *   appending its return value again. Ordinary queries and opaque `listPage()` envelopes
 *   preserve application-owned occurrence semantics. Query bonds apply `normalizeData`
 *   before publishing any fetched or explicitly set document.
 *   A list used as a filter catalogue must keep every returned choice reachable.
 *   Render its returned rows, or expose explicit pagination/More; silently slicing
 *   the first few rows hides valid filters as the catalogue grows. Server-requested
 *   limits and deliberately curated previews remain application choices.
 * - **Page data goes through a query, not a hand-written `useEffect` + `fetch`.** In React, use
 *   `useQuery` from `@molecule/app-query-react`: it keeps one request per key, stable across
 *   re-renders, and aborts it only when the key changes or the page unmounts. An effect that
 *   cancels its own request on cleanup (a `cancelled` flag or an `AbortController`) and whose deps
 *   include a function rebuilt each render cancels its request on every re-render and then skips
 *   the refetch — the response is dropped on a remote server and never on localhost.
 * - **This is a browser cache, not a store.** It holds what was fetched, for
 *   as long as it is useful; it is not where app state lives (see
 *   `@molecule/app-state`) and it never persists.
 * - **Keys are compared by value.** `['package', 'api-auth']` twice is one
 *   document; object parts compare by their entries. Put everything the fetch
 *   depends on into the key, or two different requests share one cache slot.
 * - **`get()` returns stale data too.** That is the point — a page paints
 *   what it has at once — while `subscribe()` refetches in the background.
 *   Check `updatedAt` if freshness matters for a display.
 * - **A failed fetch is never cached**, so retrying is one more `fetch()`.
 *   `prefetch()` swallows failures on purpose: the real navigation reports them.
 *   The bonded HTTP client rejects non-2xx responses. Native `fetch` resolves
 *   them, so a custom fetcher must check `response.ok` before reading JSON;
 *   otherwise an error response becomes a successfully cached document.
 * - Prefetch with intent (pointer enter, focus, touch start) and while idle,
 *   and only when `shouldPrefetch()` allows: a person on a metered or 2G
 *   connection did not ask for the page they hovered.
 * - Use one client per app (`getQueryClient()`); a second client is a second
 *   cache that knows nothing about the first.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Opening a detail page after hovering its link shows no loading
 *   state (the document was warmed) and the page is the right one.
 * - [ ] Opening the same page twice fetches it once (check the network panel).
 * - [ ] Going back to a page painted earlier paints at once, from memory.
 * - [ ] After the app invalidates a key (an edit, a refresh action), the
 *   next view shows the new data.
 * - [ ] With the browser's data-saver on, hovering links fetches nothing.
 *
 * @module
 */

export * from './keys.js'
export * from './network.js'
export * from './prefetch.js'
export * from './provider.js'
export * from './resource.js'
export * from './types.js'
