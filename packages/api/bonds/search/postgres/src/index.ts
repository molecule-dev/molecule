/**
 * PostgreSQL full-text search provider for molecule.dev.
 *
 * Implements the `SearchProvider` interface using PostgreSQL's built-in
 * `tsvector`/`tsquery` full-text search capabilities. No external search
 * engine required — uses the existing database bond.
 *
 * @example
 * ```typescript
 * import { setPool } from '@molecule/api-database'
 * import { pool } from '@molecule/api-database-postgresql'
 * import { createIndex, index, search, setProvider } from '@molecule/api-search'
 * import { createProvider } from '@molecule/api-search-postgres'
 *
 * // Startup: bond the database POOL first (raw query(); DATABASE_URL), then search.
 * setPool(pool)
 * setProvider(createProvider({ searchConfig: 'english', tablePrefix: 'search_' }))
 *
 * // Idempotent (CREATE TABLE IF NOT EXISTS) — safe to run on every boot.
 * await createIndex('products', {
 *   fields: { name: 'text', category: 'keyword', price: 'number' },
 *   sortableFields: ['price'],
 * })
 *
 * await index('products', 'p1', { name: 'Wireless Headphones', category: 'audio', price: 99 })
 *
 * const result = await search('products', {
 *   text: 'headphones',
 *   filters: { category: 'audio' }, // exact text equality on a top-level key
 *   sort: [{ field: 'price', direction: 'asc' }], // cast to number via the declared schema
 *   page: 1,
 *   perPage: 20,
 * })
 * // result.total === 1, result.hits[0].id === 'p1', result.hits[0].document.name === 'Wireless Headphones'
 * ```
 *
 * @remarks
 * Provider-specific behavior to know before debugging:
 *
 * - **Needs a PostgreSQL pool bonded with `setPool()` from `@molecule/api-database`**
 *   (e.g. `pool` from `@molecule/api-database-postgresql`) BEFORE the first call — it runs
 *   raw `query()`, not the `DataStore`, so `setStore()` alone is not enough. It uses
 *   `tsvector`/`to_tsquery`/`JSONB`, so it does NOT work on a SQLite or MySQL pool.
 * - **Each index is its own table, `<tablePrefix><name>`** (default `search_products`),
 *   created by `createIndex()` — not by your migrations. `index()`/`search()` on an index
 *   whose `createIndex()` never ran fail with Postgres "relation does not exist".
 *   `searchableFields`/`filterableFields` in the schema are ignored (all top-level strings are
 *   searchable, every top-level key is filterable); only `fields` types are recorded (for sort).
 * - **Empty/whitespace-only search text is "browse" mode** — matches ALL
 *   documents (filters/sort/pagination still apply), per the core
 *   `SearchQuery.text` contract, consistent with the meilisearch/typesense
 *   bonds. `suggest()`'s partial-query parameter is different: empty input
 *   there still returns `[]` (no autocomplete suggestions), not every document.
 * - **Search text is punctuation-safe prefix matching.** Every whitespace-separated
 *   token must match as a prefix (`widget cas` matches "widget case"). Operators
 *   typed by users (`!`, `(`, `:`, `&`, quotes) are treated as literal text, never
 *   as tsquery syntax.
 * - **Facets run one extra `GROUP BY document->>field` query per requested
 *   facet field** (values coerced to text, capped at the top 100 by count —
 *   `SearchResult.facets[field]`). Budget for that extra round trip when
 *   requesting facets on a hot path or many fields at once.
 * - **Filters compare top-level document keys as text equality**
 *   (`document->>field = value`, field bound as a query parameter — not a
 *   sanitized identifier, so punctuation in field names like `'product-type'`
 *   works). Nested paths and range filters are not supported.
 * - **Sorting casts to the field's declared type** when that field appears in
 *   the `IndexSchema.fields` passed to `createIndex()` (`number` →
 *   `double precision`, `date` → `timestamptz`, `boolean` → `boolean`) — the
 *   type map is recorded in a companion `<prefix>schema_meta` table at
 *   `createIndex()` time. Fields NOT in the schema (or indices created
 *   without one) still compare as text, so lexicographic ordering
 *   (`"10" < "9"`) is still possible for undeclared fields.
 * - **Highlights run over a dedicated `content` column** (the same plain text
 *   `index()`/`bulkIndex()` extract for full-text matching), not the raw
 *   JSON document — so snippets never contain JSON braces/keys/quotes. They
 *   still come back under a single key, `_content`, rather than per-field
 *   like the engine-backed bonds. Rows written before this column existed
 *   backfill it (empty string) on the next `createIndex()` call and get real
 *   content on their next `index()`/`bulkIndex()` write.
 * - Only top-level string values (and strings inside arrays) are indexed for
 *   full-text matching; numbers/booleans/nested objects are stored but not searchable.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
