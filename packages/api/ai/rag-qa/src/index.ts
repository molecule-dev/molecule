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
 * ```ts
 * import { indexDocument, answerQuestion } from '@molecule/api-ai-rag-qa'
 *
 * await indexDocument({
 *   collection: 'docs',
 *   documentId: 'getting-started',
 *   text: longMarkdown,
 *   metadata: { source: 'README.md' },
 * })
 *
 * const { answer, sources } = await answerQuestion({
 *   collection: 'docs',
 *   question: 'How do I configure auth?',
 * })
 * ```
 *
 * @remarks
 * Wiring — the three composed cores use TWO different mechanisms:
 * - `@molecule/api-ai-embeddings` and `@molecule/api-ai-vector-store` each
 *   keep their OWN singleton: wire each with THAT core's `setProvider(...)`
 *   (e.g. `setProvider(provider)` from `@molecule/api-ai-embeddings-local`).
 *   A generic `bond('ai-embeddings', …)` / `bond('ai-vector-store', …)` call
 *   is never seen by those cores — `indexDocument()` / `retrieve()` then throw
 *   "provider not configured" even though the bond call appeared to succeed.
 * - `@molecule/api-ai` (used by `answerQuestion`) IS registry-based:
 *   `bond('ai', provider)` or named providers work.
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
