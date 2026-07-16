/**
 * AI text-embeddings core interface for molecule.dev.
 *
 * Defines the `AIEmbeddingsProvider` contract — turn text into vectors for
 * semantic search, clustering, deduplication, and similarity scoring
 * (`embed`, `embedQuery`, `embedDocuments`) — plus the accessor
 * (`setProvider`/`getProvider`/`hasProvider`/`requireProvider`). Interface-only:
 * bond a provider package (e.g. `@molecule/api-ai-embeddings-openai`, or
 * `@molecule/api-ai-embeddings-local` for keyless local inference).
 *
 * @remarks
 * - **Wire it with THIS package's `setProvider()` — NOT `bond('ai-embeddings', …)`.**
 *   This core keeps its own singleton and does not read the `@molecule/api-bond`
 *   registry: a generic `bond('ai-embeddings', provider)` call appears to succeed,
 *   but `requireProvider()` still throws "not configured" at first use. Call
 *   `setProvider(...)` in the app's bond setup instead.
 * - **Vectors are only comparable within ONE model + dimension.** Never mix
 *   embeddings from different models (or `dimensions` settings) in the same
 *   collection/index — record which model produced a vector and re-embed the corpus
 *   when switching models.
 * - **Batch, don't loop.** Use `embed({ input: texts })` / `embedDocuments(texts)`
 *   for many texts — N separate `embedQuery()` calls multiply latency and cost.
 * - **Server-side only, gated.** The provider key stays on the API; embedding is
 *   billed per token, so auth + rate-limit any endpoint that embeds caller-supplied
 *   text.
 * - Most apps shouldn't call this directly: `@molecule/api-semantic-search` composes
 *   this bond with `@molecule/api-ai-vector-store` (index + query in one call), and
 *   `@molecule/api-ai-rag` builds grounded Q&A on top of both.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-embeddings'
 * import { createProvider } from '@molecule/api-ai-embeddings-openai'
 *
 * // Wire at startup. See the bond package for its config/env (e.g. OPENAI_API_KEY).
 * setProvider(createProvider({ defaultModel: 'text-embedding-3-small' }))
 *
 * // Use anywhere after startup.
 * const { embeddings, usage } = await requireProvider().embed({
 *   input: ['How do I reset my password?', 'Billing and invoices'],
 * })
 * const queryVector = await requireProvider().embedQuery('forgot my password')
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
