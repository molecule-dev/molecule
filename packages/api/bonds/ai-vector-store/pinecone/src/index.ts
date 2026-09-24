/**
 * Pinecone vector store provider for molecule.dev.
 *
 * Maps molecule collections to Pinecone serverless indexes, providing
 * similarity search, metadata filtering, and batch upsert operations.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-vector-store'
 * import { createProvider } from '@molecule/api-ai-vector-store-pinecone'
 *
 * // Startup (server only): the key comes from the server env.
 * setProvider(
 *   createProvider({ apiKey: process.env.PINECONE_API_KEY, cloud: 'aws', region: 'us-east-1' }),
 * )
 *
 * const store = requireProvider()
 * // Create ONCE at provisioning time — creates serverless index `mol-docs` and waits until ready.
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
 * - Config: `PINECONE_API_KEY` (required, SERVER-side only) — the Pinecone SDK throws at
 *   construction time when it is missing. The exported `provider` is a lazy proxy, so this
 *   fires on first use, NOT at import time; `createProvider()` throws eagerly.
 * - **Collections are serverless indexes created on demand** (name prefix `mol-`) in
 *   `config.cloud`/`config.region` (defaults `aws`/`us-east-1` — set these for other
 *   regions; existing indexes are never moved). With `waitUntilReady` (default `true`)
 *   `createCollection` blocks until the index is live, which can take ~a minute — create
 *   collections at startup/provisioning time, not inside request handlers.
 * - `createCollection` is NOT idempotent — Pinecone rejects creating an index name that
 *   already exists. Collection names become index names (`mol-<name>`), so use lowercase
 *   letters, digits and hyphens only (no underscores/uppercase).
 * - Pinecone is eventually consistent: a `query` right after `upsert` may not see the new
 *   records yet. Upserts are sent in batches of 100.
 * - Metadata values must be string / number / boolean / string[] (no nested objects or
 *   null); `content` is stored under the `_content` metadata key and stripped on read.
 * - `score` is normalised so HIGHER is closer: cosine and dot product are returned as-is,
 *   euclidean → `1 / (1 + distance)`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
