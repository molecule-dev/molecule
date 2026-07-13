/**
 * Elasticsearch search provider for molecule.dev.
 *
 * Implements the `SearchProvider` interface using the `@elastic/elasticsearch`
 * client. Supports full-text search, faceted filtering, bulk indexing, and
 * autocomplete suggestions.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-search'
 * import { provider } from '@molecule/api-search-elasticsearch'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * Provider-specific behavior to know before debugging:
 *
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
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
