/**
 * `@molecule/api-semantic-search` — semantic search over any document corpus.
 *
 * Composes the `@molecule/api-ai-embeddings` and `@molecule/api-ai-vector-store`
 * bonds into a reusable "index a corpus, then semantically search it"
 * capability. Wire an embeddings provider and a vector-store provider at
 * startup (see remarks), then:
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
 * @remarks
 * Wiring: `@molecule/api-ai-embeddings` and `@molecule/api-ai-vector-store`
 * are provider-singleton cores — wire them with each core's `setProvider()`,
 * NOT with `bond()` (bonding those category names is silently ignored):
 *
 * ```ts
 * import { setProvider as setEmbeddings } from '@molecule/api-ai-embeddings'
 * import { setProvider as setVectorStore } from '@molecule/api-ai-vector-store'
 * import { provider as embeddings } from '@molecule/api-ai-embeddings-openai'
 * import { provider as vectorStore } from '@molecule/api-ai-vector-store-memory'
 *
 * setEmbeddings(embeddings)
 * setVectorStore(vectorStore)
 * ```
 *
 * Provider prereqs apply: `-openai` embeddings need `OPENAI_API_KEY`;
 * `-local` embeddings download their model on first use (network + several
 * hundred MB of runtime). The `-memory` vector store keeps the index in
 * process memory — it is lost on restart and not shared across processes;
 * use `-pgvector` / `-pinecone` / `-chroma` for persistence. Both providers
 * throw a "no provider" error from the first `indexDocuments`/`search` call
 * when unwired.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './search.js'
export * from './types.js'
