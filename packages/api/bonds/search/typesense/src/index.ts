/**
 * Typesense search provider for molecule.dev.
 *
 * Implements the `SearchProvider` interface using the `typesense` client.
 * Supports full-text search, faceted filtering, bulk indexing, and
 * autocomplete suggestions.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-search'
 * import { provider } from '@molecule/api-search-typesense'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * Provider-specific behavior to know before debugging (verified against
 * Typesense 29.0):
 *
 * - **`date` fields map to `int64`** — index date values as epoch numbers
 *   (e.g. `Date.now()` or Unix seconds), NOT as `Date` objects or ISO strings,
 *   or the document is rejected by the collection schema.
 * - **When `createIndex()` is given a schema, only the keys of `schema.fields`
 *   are indexed** — document fields missing from the schema are stored and
 *   returned, but not searchable or filterable. Without a schema, an
 *   auto-schema collection (`.*: auto`) indexes every field.
 * - **Filter string values are backtick-quoted** so punctuation (`&&`, commas,
 *   parentheses) in values is safe; a literal backtick inside a filter value is
 *   not representable in Typesense filter syntax. Filtering requires the field
 *   to be faceted — declare it in `filterableFields`.
 * - **Empty search text matches ALL documents** (`q: '*'`), per the core
 *   `SearchQuery.text` browse-mode contract — consistent with every bundled
 *   search bond.
 * - `connectionTimeoutSeconds` is in seconds (default 5).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
