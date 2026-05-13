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
 * @module
 */

export * from './chunker.js'
export * from './pipeline.js'
export * from './types.js'
