/**
 * PostgreSQL pgvector vector store provider for molecule.dev.
 *
 * Stores each molecule collection as its own Postgres table (default prefix
 * `mol_vectors_`) with HNSW indexes, using the pgvector extension.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-vector-store'
 * import { provider } from '@molecule/api-ai-vector-store-pgvector'
 *
 * setProvider(provider) // at startup — lazy; reads DATABASE_URL / opens its pool on first use
 * // or pass explicit config: setProvider(createProvider({ connectionString }))
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
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
