/**
 * In-memory ai-vector-store provider for molecule.dev.
 *
 * A brute-force-cosine vector store held entirely in process memory, with zero
 * external dependencies — ideal for small corpora, tests, and local development
 * (the pgvector / Pinecone / Chroma providers all need an external service). Bond
 * it once at startup, then use the `@molecule/api-ai-vector-store` core.
 *
 * @example
 * ```ts
 * import { setProvider, requireProvider } from '@molecule/api-ai-vector-store'
 * import { provider } from '@molecule/api-ai-vector-store-memory'
 *
 * setProvider(provider) // at startup
 *
 * const store = requireProvider()
 * await store.createCollection({ name: 'docs', dimension: 384, metric: 'cosine' })
 * await store.upsert({
 *   collection: 'docs',
 *   records: [{ id: 'a', embedding: vec, metadata: { topic: 'x' } }],
 * })
 * const hits = await store.query({ collection: 'docs', embedding: queryVec, topK: 5 })
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
 *
 * @module
 */

export * from './provider.js'
