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
 * @e2e
 * Integration checklist — drive the real flow (no mocks): `upsert` real
 * vectors, run real `query` calls, and verify through the FEATURE this store
 * powers (semantic search / RAG retrieval / related-items) plus direct property
 * checks on the returned `VectorSearchResult[]`. Adapt each item to this app's
 * actual corpus/screens and check every box off. A box you can't check is an
 * integration bug to fix — not a skip:
 * - [ ] `upsert` records (each with a stable `id` + `metadata`), then `query`
 *   with an embedding: results come back ranked by `score` (highest first), the
 *   semantically closest stored item is result #1 and unrelated items rank
 *   lower — the whole point. `score` is a sane similarity (bounded, ~0–1,
 *   higher = closer) and each hit's `record.id` / `record.metadata` come back
 *   intact.
 * - [ ] `topK` is honored: a query with `topK: k` returns AT MOST k results,
 *   best-first — never more, never unordered.
 * - [ ] Metadata `filter` works: a `query` carrying a `MetadataFilter` (e.g.
 *   `{ field: 'userId', operator: 'eq', value }`) returns only records matching
 *   the filter and never leaks non-matching ones.
 * - [ ] Collection/namespace ISOLATION: a `query` scoped to one `collection`
 *   never returns another collection's vectors — the multi-tenant boundary that
 *   keeps one user's private docs out of another's results. Confirm with two
 *   collections (or two owner ids) that a scoped query returns only its own.
 * - [ ] `delete` removes a record: after `delete({ collection, ids })` the
 *   vector stops appearing in `query` results (and `fetch` omits it).
 * - [ ] The feature built on the store returns MEANING-ranked results
 *   end-to-end in the UI — a semantic-search / RAG / related-items query
 *   surfaces the relevant items first, not a keyword or insertion-order match.
 *   This store does NOT embed text itself, so confirm it composes with
 *   `@molecule/api-ai-embeddings` (query text → embedding → `query`).
 * - [ ] Every `upsert` / `query` runs SERVER-SIDE — the provider/store key
 *   stays on the server and never ships in the browser bundle (the package is
 *   server-only; a client import throws by design).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
