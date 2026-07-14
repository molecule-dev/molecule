/**
 * `@molecule/api-semantic-search` — semantic search over any document corpus.
 *
 * Composes the `@molecule/api-ai-embeddings` and `@molecule/api-ai-vector-store`
 * bonds into a reusable "index a corpus, then semantically search it"
 * capability. Bond any embeddings + vector-store provider at startup, then:
 *
 * @example
 * ```ts
 * import { indexDocuments, search, removeDocuments } from '@molecule/api-semantic-search'
 *
 * await indexDocuments({
 *   collection: 'docs',
 *   documents: [
 *     { id: 'a', text: 'Cats are feline animals.', metadata: { topic: 'animals' } },
 *     { id: 'b', text: 'Cars are fast vehicles.', metadata: { topic: 'vehicles' } },
 *   ],
 * })
 *
 * const hits = await search({
 *   collection: 'docs',
 *   query: 'domestic feline pet',
 *   topK: 3,
 *   filter: [{ field: 'topic', operator: 'eq', value: 'animals' }],
 * })
 *
 * await removeDocuments({ collection: 'docs', ids: ['a'] })
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './search.js'
export * from './types.js'
