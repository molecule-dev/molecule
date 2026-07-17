/**
 * Pinecone vector store provider for molecule.dev.
 *
 * Maps molecule collections to Pinecone serverless indexes, providing
 * similarity search, metadata filtering, and batch upsert operations.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-vector-store'
 * import { provider } from '@molecule/api-ai-vector-store-pinecone'
 *
 * setProvider(provider) // at startup — lazy; reads PINECONE_API_KEY on first use
 * // or pass explicit config: setProvider(createProvider({ apiKey }))
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
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
