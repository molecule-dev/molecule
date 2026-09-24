/**
 * Elasticsearch search provider for molecule.dev.
 *
 * Implements the `SearchProvider` interface using the `@elastic/elasticsearch`
 * client. Supports full-text search, faceted filtering, bulk indexing, and
 * autocomplete suggestions.
 *
 * @example
 * ```typescript
 * import { createIndex, index, search, setProvider } from '@molecule/api-search'
 * import { createProvider } from '@molecule/api-search-elasticsearch'
 *
 * // Startup: bond once. Env: ELASTICSEARCH_URL + ELASTICSEARCH_API_KEY
 * // (or ELASTICSEARCH_USERNAME/ELASTICSEARCH_PASSWORD).
 * setProvider(
 *   createProvider({
 *     node: process.env.ELASTICSEARCH_URL, // e.g. https://search.example.com:9200
 *     apiKey: process.env.ELASTICSEARCH_API_KEY,
 *     indexPrefix: 'myapp', // indices become 'myapp-products'
 *   }),
 * )
 *
 * // Once (e.g. a migration/seed step) — filterable strings MUST be 'keyword', not 'text'.
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
 *   page: 1,
 *   perPage: 20,
 * })
 * // result.total === 1, result.hits[0].id === 'p1', result.hits[0].document.name === 'Wireless Headphones'
 * ```
 *
 * @remarks
 * Provider-specific behavior to know before debugging:
 *
 * - **Wire it through the core** (`setProvider(...)` from `@molecule/api-search`) and call
 *   the core functions (`search`, `index`, `bulkIndex`, `deleteDocument`, …). The core's
 *   document removal is `deleteDocument()`, not `delete()`.
 * - **`createIndex()` throws if the index already exists** (Elasticsearch
 *   `resource_already_exists_exception`) — run it once at setup, not on every boot.
 * - **Filters are exact `term` queries — declare filterable string fields as
 *   `keyword` in the `createIndex()` schema.** A `term` filter against a
 *   `text`-mapped field matches ZERO documents with no error, so
 *   `createIndex()` THROWS at schema-declaration time if a field is typed
 *   `'text'` and also listed in `filterableFields` — fix by changing that
 *   field to `'keyword'`, or split it into a `text` field for full-text
 *   search plus a separate `keyword` field for filtering. This only guards
 *   schema-declared fields; on a schema-LESS index (no `createIndex()`
 *   schema, Elasticsearch dynamic-maps every string to `text`), filter on
 *   the auto-generated sub-field instead: `filters: { 'category.keyword':
 *   'electronics' }`.
 * - **Empty/whitespace-only `SearchQuery.text` is "browse" mode** — matches
 *   ALL documents (filters/sort/pagination still apply, highlighting is
 *   skipped since there is no term to highlight), consistent with the core
 *   `SearchProvider` contract and the meilisearch/typesense bonds.
 * - **Writes are immediately searchable** — `index()`, `bulkIndex()`, and
 *   `delete()` use `refresh: 'wait_for'`, trading write latency for
 *   read-your-writes consistency.
 * - **`SearchResult.total` is capped at 10,000** for larger result sets unless
 *   the index/query changes `track_total_hits` — treat it as "at least N" past
 *   that point.
 * - Configuration comes from `ELASTICSEARCH_URL`, `ELASTICSEARCH_API_KEY`, or
 *   `ELASTICSEARCH_USERNAME`/`ELASTICSEARCH_PASSWORD` (or `createProvider()`
 *   options). With none set it targets `http://localhost:9200`. Unlike the
 *   meilisearch/typesense bonds, this bond does NOT register these keys with
 *   `@molecule/api-secrets` (it would need that package as a new dependency,
 *   which is out of scope here), so they never appear in a boot-time
 *   configuration report — but an unreachable node or bad credentials no
 *   longer surface as a bare `ECONNREFUSED`/401: every method call wraps
 *   connectivity and auth failures into an actionable error naming the
 *   env var to check.
 * - **Runs behind an outbound proxy when `HTTPS_PROXY` is set.** `@elastic/transport`
 *   builds its own `undici.Pool` bound to the node origin, which bypasses the
 *   global dispatcher `NODE_USE_ENV_PROXY` installs — so on a host whose only
 *   egress path is a proxy every request used to fail with a bare connection
 *   error. The client now gets the proxy URL through its own `proxy` option
 *   (`@molecule/api-proxy-agent`, resolved against `ELASTICSEARCH_URL`). A
 *   self-hosted cluster listed in `NO_PROXY` — the common case — keeps
 *   connecting directly, and with no proxy configured nothing is passed.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
