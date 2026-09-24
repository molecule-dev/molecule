/**
 * `@molecule/api-ai-rag-qa` — RAG (retrieval-augmented generation) Q&A
 * pipeline. Chunk source documents, embed them, store in the vector
 * bond, then answer questions grounded in retrieved sources.
 *
 * Composes the existing `@molecule/api-ai`, `@molecule/api-ai-embeddings`,
 * and `@molecule/api-ai-vector-store` bonds — works with any provider
 * mix (Anthropic + OpenAI embeddings + pgvector, etc.).
 *
 * Extracted from the rag-knowledge-base flagship.
 *
 * @example
 * ```typescript
 * import { setProvider as setAIProvider } from '@molecule/api-ai'
 * import { createProvider as createChatProvider } from '@molecule/api-ai-anthropic'
 * import { setProvider as setEmbeddingsProvider } from '@molecule/api-ai-embeddings'
 * import { createProvider as createEmbeddingsProvider } from '@molecule/api-ai-embeddings-openai'
 * import { answerQuestion, indexDocument } from '@molecule/api-ai-rag-qa'
 * import {
 *   requireProvider as requireVectorStore,
 *   setProvider as setVectorStoreProvider,
 * } from '@molecule/api-ai-vector-store'
 * import { provider as memoryVectorStore } from '@molecule/api-ai-vector-store-memory'
 *
 * // Startup (server only): THREE cores — chat, embeddings, vector store.
 * setAIProvider(createChatProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))
 * setEmbeddingsProvider(
 *   createEmbeddingsProvider({ apiKey: process.env.OPENAI_API_KEY, dimensions: 256 }),
 * )
 * setVectorStoreProvider(memoryVectorStore)
 * // indexDocument() does NOT create the collection; its dimension must match the embeddings.
 * await requireVectorStore().createCollection({ name: 'docs', dimension: 256, metric: 'cosine' })
 *
 * await indexDocument({
 *   collection: 'docs',
 *   documentId: 'getting-started',
 *   text: 'To configure auth, set JWT_SECRET and bond an auth provider at startup.',
 *   metadata: { source: 'README.md' },
 * })
 *
 * const { answer, sources } = await answerQuestion({
 *   collection: 'docs',
 *   question: 'How do I configure auth?',
 * })
 * console.log(answer, sources[0]?.metadata?.source) // '...set JWT_SECRET... [1]' 'README.md'
 * ```
 *
 * @remarks
 * Wiring — bond ALL THREE cores at startup, each with its own core's
 * `setProvider(...)` (the calls are aliased in the example because all three
 * are named `setProvider`): `@molecule/api-ai-embeddings` and
 * `@molecule/api-ai-vector-store` are required by `indexDocument()` /
 * `retrieve()` (they throw "provider not configured" otherwise), and
 * `@molecule/api-ai` is required by `answerQuestion()`. The bond packages
 * (`-embeddings-openai`, `-vector-store-memory`, ...) do not wire themselves.
 *
 * `indexDocument()` never creates the collection — call the vector store's
 * `createCollection({ name, dimension })` first, with `dimension` equal to the
 * embeddings output length (e.g. 1536 for OpenAI `text-embedding-3-small`
 * unless `dimensions` is set, 384 for `@molecule/api-ai-embeddings-local`);
 * otherwise `upsert` fails (the memory store throws "does not exist").
 *
 * Vectors are only comparable within ONE embeddings model + dimension:
 * after switching embeddings providers/models, re-index the collection —
 * `retrieve()` against vectors from a different model returns meaningless
 * similarity scores, not an error.
 *
 * `deleteDocument()` deletes constructed chunk ids (`<documentId>::0..N-1`,
 * default `maxChunks: 1000`) — pass a larger `maxChunks` if a document
 * chunked into more. `answerQuestion()` with zero retrieval hits resolves
 * with the literal "I don't know based on the provided sources." and
 * `sources: []` — no model call is made.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './chunker.js'
export * from './pipeline.js'
export * from './types.js'
