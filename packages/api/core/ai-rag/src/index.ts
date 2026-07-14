/**
 * `@molecule/api-ai-rag` — the Retrieval-Augmented Generation contract.
 *
 * Defines the `AIRagProvider` interface (ingest / query / remove) plus its
 * input/result types, and the bond accessor (`setProvider` / `getProvider` /
 * `requireProvider` / …). It ships NO implementation — bond a concrete provider
 * such as `@molecule/api-ai-rag-llm`, which composes `@molecule/api-semantic-search`
 * (retrieval) with the bonded `@molecule/api-ai` chat provider (generation) to
 * answer questions grounded in your own documents.
 *
 * Everything underneath is swappable via `bond()` — different embeddings, vector
 * store, chat model, or RAG strategy, with no consumer changes.
 *
 * @example
 * ```ts
 * import { bond } from '@molecule/api-bond'
 * import { provider as embeddings } from '@molecule/api-ai-embeddings-openai'
 * import { provider as vectorStore } from '@molecule/api-ai-vector-store-memory'
 * import { provider as ai } from '@molecule/api-ai-anthropic'
 * import { provider as rag } from '@molecule/api-ai-rag-llm'
 * import { requireProvider } from '@molecule/api-ai-rag'
 *
 * // Bond the retrieval + generation dependencies first, then RAG itself.
 * bond('ai-embeddings', embeddings)
 * bond('ai-vector-store', vectorStore)
 * bond('ai', ai)
 * bond('ai-rag', rag)
 *
 * // Ingest a corpus.
 * await requireProvider().ingest({
 *   collection: 'handbook',
 *   documents: [
 *     { id: 'pto', text: 'Employees accrue 15 PTO days per year.' },
 *     { id: 'wfh', text: 'Remote work is allowed up to 3 days per week.' },
 *   ],
 * })
 *
 * // Ask a grounded question.
 * const { answer, sources, usage } = await requireProvider().query({
 *   collection: 'handbook',
 *   query: 'How many PTO days do I get?',
 *   topK: 5,
 * })
 * // answer: "You accrue 15 PTO days per year [1]."  sources: [{ id: 'pto', … }]
 * ```
 *
 * @remarks
 * A RAG provider is not built in — bond one (e.g. `@molecule/api-ai-rag-llm`).
 * The `llm` provider needs THREE bonds present at runtime: a `ai` chat provider
 * (generation) plus the `ai-embeddings` and `ai-vector-store` providers
 * (retrieval, via `@molecule/api-semantic-search`). Bond those before calling
 * `query`/`ingest`, or the underlying accessors throw. The whole capability is
 * swappable: `bond('ai-rag', myProvider)` replaces the default with your own
 * `AIRagProvider`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
