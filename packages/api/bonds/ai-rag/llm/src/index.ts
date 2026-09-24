/**
 * `@molecule/api-ai-rag-llm` — the default LLM-composed `ai-rag` provider.
 *
 * Implements `@molecule/api-ai-rag`'s `AIRagProvider` contract by composing two
 * existing molecule capabilities rather than reimplementing them:
 *
 * - **Retrieval** — `@molecule/api-semantic-search` (`indexDocuments` /
 *   `search` / `removeDocuments`), which composes the bonded `ai-embeddings`
 *   + `ai-vector-store` providers to embed a corpus and similarity-search it.
 * - **Generation** — the bonded `@molecule/api-ai` chat provider, prompted to
 *   answer using ONLY the retrieved context and to cite sources as `[n]`.
 *
 * Bond it like any other capability, then `ingest(...)` a corpus and `query(...)`
 * it. Everything underneath is swappable via `bond()` — different embeddings,
 * vector store, or chat model, with no consumer changes. It is the interchangeable
 * default for the `ai-rag` core; swap `bond('ai-rag', myProvider)` to replace it.
 *
 * @example
 * ```typescript
 * import { setProvider as setAi } from '@molecule/api-ai'
 * import { createProvider as createAnthropic } from '@molecule/api-ai-anthropic'
 * import { setProvider as setEmbeddings } from '@molecule/api-ai-embeddings'
 * import { createProvider as createOpenaiEmbeddings } from '@molecule/api-ai-embeddings-openai'
 * import { requireProvider, setProvider } from '@molecule/api-ai-rag'
 * import { provider as rag } from '@molecule/api-ai-rag-llm'
 * import { setProvider as setVectorStore } from '@molecule/api-ai-vector-store'
 * import { provider as vectorStore } from '@molecule/api-ai-vector-store-memory'
 *
 * // Startup (server only): wire ALL THREE dependencies, then this RAG provider.
 * setEmbeddings(createOpenaiEmbeddings({ apiKey: process.env.OPENAI_API_KEY }))
 * setVectorStore(vectorStore)
 * setAi(createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))
 * setProvider(rag)
 *
 * // Ingest a corpus (embeds + upserts; the collection is created on first ingest).
 * const { indexed } = await requireProvider().ingest({
 *   collection: 'handbook',
 *   documents: [
 *     { id: 'pto', text: 'Employees accrue 15 PTO days per year.' },
 *     { id: 'wfh', text: 'Remote work is allowed up to 3 days per week.' },
 *   ],
 * })
 *
 * // Ask a grounded question.
 * const { answer, sources } = await requireProvider().query({
 *   collection: 'handbook',
 *   query: 'How many PTO days do I get?',
 *   topK: 1,
 * })
 * console.log(indexed, answer, sources[0]?.id) // 2 'You accrue 15 PTO days per year [1].' 'pto'
 * ```
 *
 * @remarks
 * This provider needs THREE bonds present at runtime: a `ai` chat provider
 * (generation) plus the `ai-embeddings` and `ai-vector-store` providers
 * (retrieval, via `@molecule/api-semantic-search`). Bond those before calling
 * `query`/`ingest` — each with its own core's `setProvider(...)` (equivalent to
 * `bond('<category>', …)`) — or the underlying accessors throw. The collection
 * is created on first `ingest`. `query` still calls the model when retrieval
 * returns zero chunks, but instructs it to say it has no information rather
 * than hallucinate. The whole capability is swappable: `bond('ai-rag',
 * myProvider)` replaces this composed default with your own `AIRagProvider`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
