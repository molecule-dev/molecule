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
 * import { setProvider as setEmbeddings } from '@molecule/api-ai-embeddings'
 * import { provider as embeddings } from '@molecule/api-ai-embeddings-openai'
 * import { setProvider as setVectorStore } from '@molecule/api-ai-vector-store'
 * import { provider as vectorStore } from '@molecule/api-ai-vector-store-memory'
 * import { bond } from '@molecule/api-bond'
 * import { provider as ai } from '@molecule/api-ai-anthropic'
 * import { provider as rag } from '@molecule/api-ai-rag-llm'
 * import { requireProvider } from '@molecule/api-ai-rag'
 *
 * // Wire the retrieval + generation dependencies first, then RAG itself.
 * // ai-embeddings and ai-vector-store keep their OWN singletons — wire them with
 * // their packages' setProvider(); a generic bond('ai-embeddings', …) does NOT
 * // reach them and query()/ingest() would throw "not configured" at runtime.
 * setEmbeddings(embeddings)
 * setVectorStore(vectorStore)
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
 * The `llm` provider needs THREE dependencies present at runtime: an `ai` chat
 * provider (generation) plus the `ai-embeddings` and `ai-vector-store` providers
 * (retrieval, via `@molecule/api-semantic-search`). **Wire each through its own
 * core's registration API:** `bond('ai', …)` works for the chat provider, but
 * `ai-embeddings` and `ai-vector-store` are local-singleton cores — they are wired
 * ONLY via their packages' `setProvider()` (a generic `bond('ai-embeddings', …)`
 * is silently ignored by their accessors). Wire all three before calling
 * `query`/`ingest`, or the underlying accessors throw. The whole capability is
 * swappable: `bond('ai-rag', myProvider)` replaces the default with your own
 * `AIRagProvider`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
