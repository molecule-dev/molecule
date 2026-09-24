/**
 * ChromaDB vector store provider for molecule.dev.
 *
 * Maps molecule collections to ChromaDB collections (default name prefix `mol_`)
 * with HNSW indexing for similarity search.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-vector-store'
 * import { createProvider } from '@molecule/api-ai-vector-store-chroma'
 *
 * // Startup (server only): point at your ChromaDB server (`chroma run` listens on :8000).
 * setProvider(
 *   createProvider({
 *     host: process.env.CHROMA_HOST ?? 'localhost',
 *     port: Number(process.env.CHROMA_PORT ?? 8000),
 *     apiKey: process.env.CHROMA_API_KEY, // only for ChromaDB Cloud / auth-enabled servers
 *   }),
 * )
 *
 * const store = requireProvider()
 * // Create ONCE (e.g. in a migration/seed) — Chroma rejects creating an existing name.
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
 * console.log(hits[0]?.record.id, hits[0]?.record.content, hits[0]?.score) // 'login' 'Reset password' 0.99
 * ```
 *
 * @remarks
 * - **Requires a reachable ChromaDB server** — this bond only speaks HTTP to one
 *   (default `http://localhost:8000`; run `chroma run` or the official docker image),
 *   or ChromaDB Cloud with `CHROMA_API_KEY` set (optional env fallback for
 *   `config.apiKey`) plus `ssl`/`tenant`/`database` config. There is no embedded mode.
 * - **Wiring**: bond the lazy `provider` export once — `setProvider(provider)` — or
 *   `setProvider(createProvider(config?))` to pass explicit config; for a
 *   zero-dependency store (tests/dev) use `@molecule/api-ai-vector-store-memory`.
 * - `CHROMA_API_KEY` is the ONLY env var read — host/port/ssl/tenant/database come from
 *   `createProvider({...})` (the lazy `provider` export always uses `localhost:8000`).
 * - Collections are stored as `mol_<name>` (`collectionPrefix`); `listCollections()` only
 *   returns prefixed ones, with the prefix stripped. `createCollection` is NOT idempotent —
 *   the Chroma client throws if the collection already exists.
 * - `dimension` is recorded as collection metadata but NOT validated on upsert — Chroma
 *   itself rejects a mismatched vector length once the first vector fixes it.
 * - Metadata values must be string / number / boolean — anything else (arrays, objects,
 *   null) is silently DROPPED on upsert. `content` is stored under the `_content` metadata key.
 * - `score` is normalised so HIGHER is closer: cosine → `1 - distance`, euclidean →
 *   `1 / (1 + distance)`, inner_product → the dot product.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
