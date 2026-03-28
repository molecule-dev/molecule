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
 * @module
 */

export * from './provider.js'
export * from './types.js'
