/**
 * In-memory bond for `@molecule/app-query`.
 *
 * A Map of documents with freshness, shared in-flight fetches, observers and
 * garbage collection, and nothing else: no dependency, a few kilobytes. The
 * right bond when the app has no other reason to ship a query library; the
 * `@molecule/app-query-tanstack` bond is the same contract over TanStack Query
 * for apps that already use it or want its devtools.
 *
 * @example
 * ```typescript
 * import { getQueryClient, setProvider } from '@molecule/app-query'
 * import { provider } from '@molecule/app-query-memory'
 *
 * setProvider(provider)
 * const client = getQueryClient()
 * await client.fetch({ key: ['profile'], fetch: (signal) => api.get('/me', { signal }) })
 * ```
 *
 * @remarks
 * - Documents are dropped `gcMs` after their last observer leaves (default 30
 *   minutes) — a cache, not a store: nothing survives a reload.
 * - `subscribe()` refetches a stale document while still emitting the stale
 *   data first, so a component paints at once and updates when the fresh copy
 *   lands.
 * - Swapping to `@molecule/app-query-tanstack` changes no application code:
 *   both pass the same behavioural suite.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
