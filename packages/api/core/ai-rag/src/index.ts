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
 * // Startup (server only): wire ALL THREE dependencies, then RAG itself.
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
 * - A RAG provider is not built in — bond one (e.g. `@molecule/api-ai-rag-llm`) with this
 *   package's `setProvider()`.
 * - The `llm` provider needs THREE more bonds at runtime: an `ai` chat provider
 *   (generation) plus `ai-embeddings` and `ai-vector-store` providers (retrieval, via
 *   `@molecule/api-semantic-search`). Wire all three before `ingest`/`query`, or the
 *   underlying accessors throw "not configured". Each core's `setProvider()` and the
 *   generic `bond('<category>', …)` are equivalent.
 * - `ingest` and `query` must use the SAME embeddings model — vectors from different
 *   models are not comparable. Re-ingest the corpus after switching models.
 * - The memory vector store is per-process and lost on restart; use a persistent store
 *   (e.g. `@molecule/api-ai-vector-store-pgvector`) in production.
 * - `query` returns `{ answer, sources, usage }`; `sources` are the retrieved chunks the
 *   answer cites as `[1]`, `[2]`, … in rank order. With no relevant chunks the model is told
 *   to say it does not know, rather than to answer from its own knowledge.
 * - The whole capability is swappable: `setProvider(myProvider)` replaces the default with
 *   your own `AIRagProvider`.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] After ingesting a known document set, ask a question whose answer is
 *   IN the corpus: the returned answer USES the retrieved content — it states
 *   the specific fact from the source doc (with the [n] citation `query()`
 *   returns), NOT the base model's generic prior. If it's right only because
 *   the model already knew the fact, retrieval isn't actually wired.
 * - [ ] Retrieval genuinely runs — the answer tracks the corpus. Remove the
 *   source doc (`remove({ collection, ids })`) or ingest a corrected version,
 *   then re-ask: the answer changes or disappears; it must NOT keep reciting a
 *   fact whose document is gone.
 * - [ ] An out-of-corpus question is DECLINED ("I don't have information on
 *   that" / "not in the documents"), not answered from the model's own prior.
 *   This is the key RAG failure to catch — a confident, well-formed answer to a
 *   question no ingested document supports is a hallucination and fails the box.
 * - [ ] A newly ingested document is answerable immediately: `ingest()` one more
 *   doc, then ask about its content in the same session — it's retrieved with no
 *   rebuild or redeploy.
 * - [ ] Every source `query()` returns points to a really-ingested document
 *   (its `id`/text matches a `RagDocument` you actually ingested), and each [n]
 *   citation in the answer maps to one of those returned sources — no fabricated
 *   ids and no dangling [n] with no matching source.
 * - [ ] Retrieval is SCOPED to the caller's own data: a query resolves only the
 *   authenticated user's/tenant's `collection` (or metadata `filter`) and can
 *   NOT surface another tenant's private documents in `answer` or `sources`.
 *   Confirm by ingesting two tenants' docs and querying as one — the other's
 *   content never appears.
 * - [ ] The RAG call is server-side only — ingest/query run in an API route,
 *   and the embeddings/AI provider key is never shipped to or readable in the
 *   browser.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
