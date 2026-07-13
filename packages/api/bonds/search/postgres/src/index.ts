/**
 * PostgreSQL full-text search provider for molecule.dev.
 *
 * Implements the `SearchProvider` interface using PostgreSQL's built-in
 * `tsvector`/`tsquery` full-text search capabilities. No external search
 * engine required — uses the existing database bond.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-search'
 * import { provider } from '@molecule/api-search-postgres'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * Provider-specific behavior to know before debugging:
 *
 * - **Facets are not supported.** `SearchQuery.facets` is silently ignored and
 *   `SearchResult.facets` is never returned — this is not a bug in your query.
 *   Use the Meilisearch/Typesense/Elasticsearch bond if you need facet counts.
 * - **Search text is punctuation-safe prefix matching.** Every whitespace-separated
 *   token must match as a prefix (`widget cas` matches "widget case"). Operators
 *   typed by users (`!`, `(`, `:`, `&`, quotes) are treated as literal text, never
 *   as tsquery syntax. Empty/whitespace-only text returns zero hits (and `suggest()`
 *   returns `[]`) rather than erroring.
 * - **Filters compare top-level document keys as text equality** (`document->>'field'
 *   = value`). Nested paths and range filters are not supported; non-alphanumeric
 *   characters in filter field names are replaced with `_`.
 * - **Sorting compares values as text**, so numeric fields sort lexicographically
 *   ("10" < "9"). Prefer relevance ordering (the default) for numeric-heavy data.
 * - **Highlights come back under the single key `_content`**, generated over the
 *   document's JSON text — not per-field like the engine-backed bonds.
 * - Only top-level string values (and strings inside arrays) are indexed for
 *   full-text matching; numbers/booleans/nested objects are stored but not searchable.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
