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
