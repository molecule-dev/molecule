/**
 * TanStack Query bond for `@molecule/app-query`.
 *
 * The molecule query contract over `@tanstack/query-core`: the same
 * `fetch` / `prefetch` / `get` / `subscribe` calls, backed by TanStack's
 * cache, deduplication, staleness and garbage collection. Wrap an app's
 * existing TanStack client so molecule packages and the app's own hooks
 * share one cache.
 *
 * @example
 * ```typescript
 * import { QueryClient } from '@tanstack/query-core'
 * import { setProvider } from '@molecule/app-query'
 * import { createProvider, provider } from '@molecule/app-query-tanstack'
 *
 * setProvider(provider)                                   // its own client
 * // or share the app's:
 * setProvider(createProvider({ client: new QueryClient() }))
 * ```
 *
 * @remarks
 * - **Retries are off.** The contract says a failed fetch rejects and is not
 *   cached; TanStack's default of three retries would hide that. Wrap
 *   `fetch` yourself if a query should retry.
 * - `invalidate(key)` marks matching queries stale without refetching them;
 *   observers refetch on their next subscription and `fetch()` refetches on
 *   its next call, exactly as with the memory bond.
 * - A query nobody observes is garbage-collected `gcMs` after its last use
 *   (TanStack's `gcTime`), so `get()` can return `undefined` for something
 *   fetched long ago; treat it as a cache.
 * - Framework hooks live in `@molecule/app-query-react`, not here; this bond
 *   depends only on `@tanstack/query-core`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
