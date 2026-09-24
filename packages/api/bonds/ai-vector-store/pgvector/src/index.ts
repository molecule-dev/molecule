/**
 * PostgreSQL pgvector vector store provider for molecule.dev.
 *
 * Stores each molecule collection as its own Postgres table (default prefix
 * `mol_vectors_`) with HNSW indexes, using the pgvector extension.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-vector-store'
 * import { createProvider } from '@molecule/api-ai-vector-store-pgvector'
 *
 * // Startup (server only): its own pg pool — the database needs the `vector` extension.
 * setProvider(createProvider({ connectionString: process.env.DATABASE_URL }))
 *
 * const store = requireProvider()
 * // Idempotent: safe on every boot (throws only if the dimension changed).
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
 * const hits = await store.query({
 *   collection: 'docs',
 *   embedding: [0, 0.1, 1],
 *   topK: 1,
 *   filter: [{ field: 'topic', operator: 'eq', value: 'auth' }],
 * })
 * console.log(hits[0]?.record.id, hits[0]?.record.content, hits[0]?.score) // 'login' 'Reset password' 0.99
 * ```
 *
 * @remarks
 * - **Owns its own `pg.Pool`** — it does NOT go through the `@molecule/api-database`
 *   bond. Connection comes from `config.connectionString` or the `DATABASE_URL` env
 *   var; `poolSize` (default 5) is independent of the app's database pool.
 * - **Requires the pgvector extension.** On first use it runs
 *   `CREATE EXTENSION IF NOT EXISTS vector` — the connecting role must be allowed to
 *   create extensions, otherwise install `vector` up front via a migration/DBA.
 * - Auto-creates its tables: a `mol_vectors_collections` registry plus one
 *   `mol_vectors_<collection>` table (+ HNSW index) per collection — no migration
 *   needed beyond the extension. `topK` is clamped to [1, 10000] before hitting SQL.
 * - `dimension` is fixed per collection (`vector(<dimension>)` column) — upserting a vector of
 *   another length fails in Postgres; changing embedding models means a new collection.
 * - `score` is normalised so HIGHER is closer: cosine → `1 - distance`, euclidean →
 *   `1 / (1 + distance)`, inner_product → the dot product. `minScore` uses that scale.
 * - Metadata filters compare `metadata->>'field'` as TEXT for `eq`/`ne`/`in` and cast to
 *   numeric for `gt`/`gte`/`lt`/`lte`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
