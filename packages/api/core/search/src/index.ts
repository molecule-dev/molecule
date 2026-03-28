/**
 * Provider-agnostic full-text search interface for molecule.dev.
 *
 * Defines the `SearchProvider` interface for indexing, querying, and
 * autocomplete suggestions. Bond packages (Elasticsearch, Meilisearch,
 * Typesense, PostgreSQL, etc.) implement this interface. Application code
 * uses the convenience functions (`search`, `index`, `suggest`, etc.) which
 * delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, search, index, suggest } from '@molecule/api-search'
 * import { provider as elasticsearch } from '@molecule/api-search-elasticsearch'
 *
 * setProvider(elasticsearch)
 * await index('products', '1', { name: 'Widget', price: 9.99 })
 * const results = await search('products', { text: 'widget', highlight: true })
 * const suggestions = await suggest('products', 'wid', { limit: 5 })
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
