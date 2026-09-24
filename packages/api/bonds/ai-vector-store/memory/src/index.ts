/**
 * In-memory ai-vector-store provider for molecule.dev.
 *
 * A brute-force-cosine vector store held entirely in process memory, with zero
 * external dependencies — ideal for small corpora, tests, and local development
 * (the pgvector / Pinecone / Chroma providers all need an external service). Bond
 * it once at startup, then use the `@molecule/api-ai-vector-store` core.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-vector-store'
 * import { provider } from '@molecule/api-ai-vector-store-memory'
 *
 * setProvider(provider) // at startup — no config, no env vars
 *
 * const store = requireProvider()
 * // The collection must exist before upsert; `dimension` must match your embedding model.
 * await store.createCollection({ name: 'docs', dimension: 3, metric: 'cosine' })
 * await store.upsert({
 *   collection: 'docs',
 *   records: [
 *     { id: 'billing', embedding: [0.9, 0.1, 0], metadata: { topic: 'billing' }, content: 'Invoices' },
 *     { id: 'login', embedding: [0, 0.2, 0.9], metadata: { topic: 'auth' }, content: 'Reset password' },
 *   ],
 * })
 *
 * // In real code the query vector comes from `@molecule/api-ai-embeddings` `embedQuery()`.
 * const hits = await store.query({ collection: 'docs', embedding: [0, 0.1, 1], topK: 1 })
 * console.log(hits[0]?.record.id, hits[0]?.record.content) // 'login' 'Reset password'
 * console.log(hits[0]?.score) // ~0.996 (cosine mapped to 0..1, higher = closer)
 * ```
 *
 * @remarks
 * - **Not persistent** — the index lives in process memory and is gone on restart.
 *   Rebuild it at startup, or use a persistent provider (pgvector/Pinecone) for
 *   durable data.
 * - `upsert` throws if the collection doesn't exist, or if an embedding's length
 *   differs from the collection's dimension (validated before any write, so a bad
 *   batch leaves the collection unchanged).
 * - Query is O(n) per call (brute-force cosine) — great for thousands of vectors,
 *   not millions.
 * - The store is ONE module-level map shared by every importer in the process — collection
 *   names are global, and there is no `createProvider()` / per-instance isolation.
 * - `score` is normalised so HIGHER is always closer: cosine → `(cos + 1) / 2` (0..1),
 *   euclidean → `1 / (1 + distance)`, inner_product → the raw dot product. Pick `minScore`
 *   in that scale.
 * - `createCollection` is idempotent for the same dimension but throws for a different one.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
