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
 * @module
 */

export * from './provider.js'
export * from './types.js'
