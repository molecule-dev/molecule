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
 * @module
 */

export * from './provider.js'
export * from './types.js'
