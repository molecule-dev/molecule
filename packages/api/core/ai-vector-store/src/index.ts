/**
 * AI vector-store core interface for molecule.dev.
 *
 * Defines the `AIVectorStoreProvider` contract — named collections of embedding
 * vectors with `upsert`, similarity `query` (metadata filters, `topK`,
 * `minScore`), `fetch`, and `delete` — plus the accessor (`setProvider`/
 * `getProvider`/`hasProvider`/`requireProvider`). Interface-only: bond a
 * provider package (`@molecule/api-ai-vector-store-pgvector`, `-pinecone`,
 * `-chroma`, or `-memory` for dev/tests).
 *
 * @remarks
 * - **Wire it with THIS package's `setProvider()` — NOT `bond('ai-vector-store', …)`.**
 *   This core keeps its own singleton and does not read the `@molecule/api-bond`
 *   registry: a generic `bond(...)` call appears to succeed, but `requireProvider()`
 *   still throws at first use. Call `setProvider(...)` in the app's bond setup.
 * - **Pick the bond by what is actually provisioned.** `-memory` needs nothing but
 *   holds vectors in process memory (lost on restart — dev/tests only). `-pgvector`
 *   reuses the app's existing Postgres (`DATABASE_URL`) and provisions its own
 *   extension/tables. Managed stores (Pinecone, Chroma) require their service and
 *   key to actually exist — don't wire one on the assumption that it does.
 * - **This store does NOT embed.** `upsert` takes precomputed `embedding` vectors —
 *   pair it with `@molecule/api-ai-embeddings`, or use
 *   `@molecule/api-semantic-search` (composes both) / `@molecule/api-ai-rag`
 *   (grounded Q&A) instead of calling this directly.
 * - **One collection = one embedding model + dimension.** `createCollection` fixes
 *   `dimension`; upserting vectors from a different model/dimension corrupts search
 *   results (or throws). Re-embed the corpus when switching models.
 * - **Scope multi-tenant data.** Put the owner (user/tenant id) in `metadata` and
 *   filter on it in EVERY `query` (or use per-tenant collections) — a shared,
 *   unfiltered collection leaks one tenant's documents into another's results.
 * - `query` results are sorted by `score` (higher = more similar, 0–1 where
 *   possible); use `minScore` to drop weak matches rather than trusting `topK`
 *   alone.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-vector-store'
 * import { provider as memory } from '@molecule/api-ai-vector-store-memory'
 *
 * // Wire at startup — memory for dev; swap to pgvector/pinecone when provisioned.
 * setProvider(memory)
 *
 * const store = requireProvider()
 * await store.createCollection({ name: 'docs', dimension: 1536, metric: 'cosine' })
 * await store.upsert({
 *   collection: 'docs',
 *   records: [{ id: 'a', embedding: vec, content: 'PTO policy…', metadata: { userId: 'u1' } }],
 * })
 * const hits = await store.query({
 *   collection: 'docs',
 *   embedding: queryVec,
 *   topK: 5,
 *   filter: [{ field: 'userId', operator: 'eq', value: 'u1' }],
 * })
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
