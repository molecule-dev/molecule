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
 *   `text`-mapped field (the `text` field type, or any string field on an
 *   index created WITHOUT a schema, which Elasticsearch dynamic-maps to
 *   `text`) matches ZERO documents with no error. On schema-less indices,
 *   filter on the auto-generated sub-field instead: `filters: { 'category.keyword':
 *   'electronics' }`.
 * - **Writes are immediately searchable** — `index()`, `bulkIndex()`, and
 *   `delete()` use `refresh: 'wait_for'`, trading write latency for
 *   read-your-writes consistency.
 * - **`SearchResult.total` is capped at 10,000** for larger result sets unless
 *   the index/query changes `track_total_hits` — treat it as "at least N" past
 *   that point.
 * - Configuration comes from `ELASTICSEARCH_URL`, `ELASTICSEARCH_API_KEY`, or
 *   `ELASTICSEARCH_USERNAME`/`ELASTICSEARCH_PASSWORD` (or `createProvider()`
 *   options). With none set it targets `http://localhost:9200`; an unreachable
 *   node surfaces as a connection error at first call, not at bond time.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
