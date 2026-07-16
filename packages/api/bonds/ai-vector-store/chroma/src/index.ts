/**
 * ChromaDB vector store provider for molecule.dev.
 *
 * Maps molecule collections to ChromaDB collections (default name prefix `mol_`)
 * with HNSW indexing for similarity search.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-vector-store'
 * import { createProvider } from '@molecule/api-ai-vector-store-chroma'
 *
 * // This bond exports NO `provider` const — wire the factory:
 * setProvider(createProvider({ host: 'localhost', port: 8000 }))
 * ```
 *
 * @remarks
 * - **Requires a reachable ChromaDB server** — this bond only speaks HTTP to one
 *   (default `http://localhost:8000`; run `chroma run` or the official docker image),
 *   or ChromaDB Cloud with `CHROMA_API_KEY` set (optional env fallback for
 *   `config.apiKey`) plus `ssl`/`tenant`/`database` config. There is no embedded mode.
 * - **Wiring**: no lazy `provider` export — `setProvider(createProvider(config?))`;
 *   for a zero-dependency store (tests/dev) use `@molecule/api-ai-vector-store-memory`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
