/**
 * Meilisearch search provider for molecule.dev.
 *
 * Implements the `SearchProvider` interface using the `meilisearch` client.
 * Supports full-text search, faceted filtering, bulk indexing, and
 * autocomplete suggestions.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-search'
 * import { provider } from '@molecule/api-search-meilisearch'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * Provider-specific behavior to know before debugging:
 *
 * - **Write operations wait for the Meilisearch task and THROW if it failed**,
 *   with the Meilisearch error code in the message (e.g.
 *   `index_already_exists`, `index_not_found`, `invalid_document_fields`) —
 *   so `createIndex()` on an existing index and `deleteIndex()` on a missing
 *   one are errors you can tell apart, and a rejected document is never
 *   silently reported as indexed. Task waiting times out after
 *   `taskTimeoutMs` (default 30 s) — a timeout means "still processing",
 *   not "failed".
 * - **Filtering requires filterable attributes.** Pass `filterableFields` in the
 *   `createIndex()` schema (or the filter errors with `invalid_search_filter`).
 *   Filters compare as `field = "value"` string equality; values are escaped, so
 *   quotes in data are safe.
 * - **`SearchHit.score` is Meilisearch's `_rankingScore`** (requested
 *   automatically). `SearchResult.total` is Meilisearch's `estimatedTotalHits` —
 *   an estimate, suitable for pagination but not for exact counts.
 * - **Empty search text matches ALL documents** (Meilisearch placeholder
 *   search) — unlike the postgres bond, which returns zero hits for empty text.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
