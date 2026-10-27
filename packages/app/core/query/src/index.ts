/**
 * Client-side query cache core interface for molecule.dev.
 *
 * One in-memory cache of documents the app fetches — a package page, a
 * profile, a list — keyed by value, read synchronously, warmed ahead of a
 * navigation, and observed by components. Bond a provider (e.g.
 * `@molecule/app-query-tanstack`) at startup, then use
 * {@link getQueryClient} anywhere; `@molecule/app-query-react` adds the hooks.
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
export * from './provider.js'
export * from './types.js'
