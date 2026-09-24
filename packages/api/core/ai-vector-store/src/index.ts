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
 * - **Wire it at startup with `setProvider(...)` — or the equivalent
 *   `bond('ai-vector-store', provider)`.** This core routes through the shared
 *   `@molecule/api-bond` registry, so either call registers the same provider and
 *   `validateBonds()` reports it as missing when unwired.
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
 * - `query` returns `{ record, score }[]` — the id/content are on `hit.record`, not on
 *   the hit. `upsert` into a collection that was never created THROWS; call
 *   `createCollection` first (it is a no-op when the collection already exists with
 *   the same dimension).
 * - The score scale is provider-specific — the memory bond maps cosine onto 0–1, so an
 *   UNRELATED vector still scores ~0.5. Tune `minScore` for the bonded provider.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-vector-store'
 * import { provider as memory } from '@molecule/api-ai-vector-store-memory'
 *
 * // Startup: memory needs nothing (dev/tests); swap to pgvector/pinecone when provisioned.
 * setProvider(memory)
 *
 * // Vectors come from an embeddings bond; tiny 3-dim vectors keep the example readable.
 * const store = requireProvider()
 * await store.createCollection({ name: 'docs', dimension: 3, metric: 'cosine' })
 * await store.upsert({
 *   collection: 'docs',
 *   records: [
 *     { id: 'pto', embedding: [1, 0, 0], content: 'PTO policy', metadata: { userId: 'u1' } },
 *     { id: 'wfh', embedding: [0, 1, 0], content: 'Remote work', metadata: { userId: 'u1' } },
 *     { id: 'other', embedding: [1, 0, 0], content: 'PTO (u2)', metadata: { userId: 'u2' } },
 *   ],
 * })
 *
 * // ALWAYS scope by owner; results are sorted by score, highest first.
 * const hits = await store.query({
 *   collection: 'docs',
 *   embedding: [0.9, 0.1, 0],
 *   topK: 5,
 *   minScore: 0.8,
 *   filter: [{ field: 'userId', operator: 'eq', value: 'u1' }],
 * })
 * console.log(hits.map((hit) => [hit.record.id, hit.score.toFixed(2)])) // [['pto', '1.00']]
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
