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
 * import { getQueryClient, setProvider } from '@molecule/app-query'
 * import { provider } from '@molecule/app-query-tanstack'
 *
 * setProvider(provider)
 *
 * const packageQuery = (name: string) => ({
 *   key: ['package', name],
 *   fetch: (signal: AbortSignal) =>
 *     fetch(`/data/packages/${name}.json`, { signal }).then((r) => r.json()),
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
