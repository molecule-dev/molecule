/**
 * Meilisearch search provider for molecule.dev.
 *
 * Implements the `SearchProvider` interface using the `meilisearch` client.
 * Supports full-text search, faceted filtering, bulk indexing, and
 * autocomplete suggestions.
 *
 * @example
 * ```typescript
 * import { createIndex, index, search, setProvider } from '@molecule/api-search'
 * import { createProvider } from '@molecule/api-search-meilisearch'
 *
 * // Startup: bond once. Env: MEILISEARCH_URL (default http://localhost:7700) and
 * // MEILISEARCH_API_KEY (the master key or a scoped key; optional for keyless local instances).
 * setProvider(
 *   createProvider({
 *     host: process.env.MEILISEARCH_URL,
 *     apiKey: process.env.MEILISEARCH_API_KEY,
 *   }),
 * )
 *
 * // Once (e.g. a setup/seed step): filters and sort only work on declared attributes.
 * await createIndex('products', {
 *   fields: { name: 'text', category: 'keyword', price: 'number' },
 *   searchableFields: ['name'],
 *   filterableFields: ['category'],
 *   sortableFields: ['price'],
 * })
 *
 * await index('products', 'p1', { name: 'Wireless Headphones', category: 'audio', price: 99 })
 *
 * const result = await search('products', {
 *   text: 'headphones',
 *   filters: { category: 'audio' },
 *   sort: [{ field: 'price', direction: 'asc' }],
 * })
 * // result.hits[0].id === 'p1', result.hits[0].document.name === 'Wireless Headphones'
 * ```
 *
 * @remarks
 * Provider-specific behavior to know before debugging:
 *
 * - **Wire it through the core** (`setProvider(...)` from `@molecule/api-search`) and call
 *   the core functions; the core's document removal is `deleteDocument()`, not `delete()`.
 * - **`bulkIndex()` never throws on a failed task** — it RESOLVES with
 *   `{ indexed: 0, failed: documents.length, errors }` (one message per id). Check
 *   `result.failed`, not just that the promise resolved. `index()` (single document) does throw.
 * - **The primary key is always `id`** — the `id` argument is written into the stored document
 *   and stripped again from `getDocument()`'s result.
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
 * - **Empty search text matches ALL documents** (Meilisearch placeholder search),
 *   per the core `SearchQuery.text` browse-mode contract — consistent with every
 *   bundled search bond.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
