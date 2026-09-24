/**
 * Typesense search provider for molecule.dev.
 *
 * Implements the `SearchProvider` interface using the `typesense` client.
 * Supports full-text search, faceted filtering, bulk indexing, and
 * autocomplete suggestions.
 *
 * @example
 * ```typescript
 * import { createIndex, index, search, setProvider } from '@molecule/api-search'
 * import { createProvider } from '@molecule/api-search-typesense'
 *
 * // Startup: bond once. Env: TYPESENSE_HOST, TYPESENSE_PORT, TYPESENSE_PROTOCOL, TYPESENSE_API_KEY.
 * setProvider(
 *   createProvider({
 *     nodes: [
 *       {
 *         host: process.env.TYPESENSE_HOST ?? 'localhost',
 *         port: Number(process.env.TYPESENSE_PORT ?? 8108),
 *         protocol: process.env.TYPESENSE_PROTOCOL ?? 'http',
 *       },
 *     ],
 *     apiKey: process.env.TYPESENSE_API_KEY,
 *     connectionTimeoutSeconds: 5, // SECONDS
 *   }),
 * )
 *
 * // Once (a setup/seed step): only schema fields are indexed; filter fields must be filterable.
 * await createIndex('products', {
 *   fields: { name: 'text', category: 'keyword', price: 'number' },
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
 * // result.total === 1, result.hits[0].id === 'p1', result.hits[0].document.name === 'Wireless Headphones'
 * ```
 *
 * @remarks
 * Provider-specific behavior to know before debugging (verified against
 * Typesense 29.0):
 *
 * - **Wire it through the core** (`setProvider(...)` from `@molecule/api-search`) and call
 *   the core functions; the core's document removal is `deleteDocument()`, not `delete()`.
 * - **`createIndex()` is not idempotent** — creating a collection that already exists is
 *   rejected by Typesense (HTTP 409). Run it once at setup, not on every boot.
 * - **Index names are used verbatim as collection names** — there is no prefix option.
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
