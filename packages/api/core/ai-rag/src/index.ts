/**
 * `@molecule/api-ai-rag` — batteries-included Retrieval-Augmented Generation.
 *
 * Ships a working default `provider` that answers questions grounded in your
 * own documents. It composes two existing molecule capabilities rather than
 * reimplementing them:
 *
 * - **Retrieval** — `@molecule/api-semantic-search` (`indexDocuments` /
 *   `search` / `removeDocuments`), which composes the bonded `ai-embeddings`
 *   + `ai-vector-store` providers to embed a corpus and similarity-search it.
 * - **Generation** — the bonded `@molecule/api-ai` chat provider, prompted to
 *   answer using ONLY the retrieved context and to cite sources as `[n]`.
 *
 * Bond it like any other capability, then `ingest(...)` a corpus and `query(...)`
 * it. Everything underneath is swappable via `bond()` — different embeddings,
 * vector store, or chat model, with no consumer changes.
 *
 * @example
 * ```ts
 * import { bond } from '@molecule/api-bond'
 * import { provider as embeddings } from '@molecule/api-ai-embeddings-openai'
 * import { provider as vectorStore } from '@molecule/api-ai-vector-store-memory'
 * import { provider as ai } from '@molecule/api-ai-anthropic'
 * import { provider as rag, requireProvider } from '@molecule/api-ai-rag'
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
 * The default provider needs THREE bonds present at runtime: a `ai` chat
 * provider (generation) plus the `ai-embeddings` and `ai-vector-store`
 * providers (retrieval, via `@molecule/api-semantic-search`). Bond those before
 * calling `query`/`ingest`, or the underlying accessors throw. `query` still
 * calls the model when retrieval returns zero chunks, but instructs it to say it
 * has no information rather than hallucinate. The whole capability is swappable:
 * `bond('ai-rag', myProvider)` replaces the composed default with your own
 * `AIRagProvider`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
