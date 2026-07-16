# @molecule/api-ai-vector-store-pgvector

PostgreSQL pgvector vector store provider for molecule.dev.

Stores each molecule collection as its own Postgres table (default prefix
`mol_vectors_`) with HNSW indexes, using the pgvector extension.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-ai-vector-store'
import { createProvider } from '@molecule/api-ai-vector-store-pgvector'

// This bond exports NO `provider` const — wire the factory (reads DATABASE_URL):
setProvider(createProvider())
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-vector-store-pgvector @molecule/api-ai-vector-store pg pgvector
npm install -D @types/pg
```

## API

### Interfaces

#### `PgvectorConfig`

Configuration for the pgvector vector store provider.

```typescript
interface PgvectorConfig {
  /** PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/db`). Falls back to `DATABASE_URL` env var. */
  connectionString?: string
  /** Schema to use for vector store tables. Defaults to `'public'`. */
  schema?: string
  /** Table name prefix for vector store tables. Defaults to `'mol_vectors_'`. */
  tablePrefix?: string
  /** Default distance metric for new collections. Defaults to `'cosine'`. */
  defaultMetric?: DistanceMetric
  /** Connection pool size. Defaults to 5. */
  poolSize?: number
}
```

### Functions

#### `clampTopK(value)`

[M7-2] Coerce a requested `topK` into a bounded positive integer for SAFE interpolation into
the `LIMIT` clause (it is not a bound `$N` parameter). `topK` is typed `number`, but a caller
forwarding an untrusted value (e.g. `req.body.topK` cast to `any`) could otherwise inject SQL
or request an unbounded scan. Non-finite / `< 1` falls back to the default 10; capped at 10_000.

```typescript
function clampTopK(value: unknown): number
```

- `value` — The caller-supplied `topK` (untyped at runtime).

**Returns:** A safe integer in `[1, 10000]`.

#### `createProvider(config)`

Creates a pgvector vector store provider instance.

```typescript
function createProvider(config?: PgvectorConfig): PgvectorProvider
```

- `config` — PostgreSQL + pgvector configuration.

**Returns:** An `AIVectorStoreProvider` backed by PostgreSQL with pgvector.

## Core Interface
Implements `@molecule/api-ai-vector-store` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-vector-store` >=1.0.0

### Runtime Dependencies

- `@molecule/api-ai-vector-store`
- `pg`
- `pgvector`

- **Owns its own `pg.Pool`** — it does NOT go through the `@molecule/api-database`
  bond. Connection comes from `config.connectionString` or the `DATABASE_URL` env
  var; `poolSize` (default 5) is independent of the app's database pool.
- **Requires the pgvector extension.** On first use it runs
  `CREATE EXTENSION IF NOT EXISTS vector` — the connecting role must be allowed to
  create extensions, otherwise install `vector` up front via a migration/DBA.
- Auto-creates its tables: a `mol_vectors_collections` registry plus one
  `mol_vectors_<collection>` table (+ HNSW index) per collection — no migration
  needed beyond the extension. `topK` is clamped to [1, 10000] before hitting SQL.

## E2E Tests

Integration checklist — drive the real flow (no mocks): `upsert` real
vectors, run real `query` calls, and verify through the FEATURE this store
powers (semantic search / RAG retrieval / related-items) plus direct property
checks on the returned `VectorSearchResult[]`. Adapt each item to this app's
actual corpus/screens and check every box off. A box you can't check is an
integration bug to fix — not a skip:
- [ ] `upsert` records (each with a stable `id` + `metadata`), then `query`
  with an embedding: results come back ranked by `score` (highest first), the
  semantically closest stored item is result #1 and unrelated items rank
  lower — the whole point. `score` is a sane similarity (bounded, ~0–1,
  higher = closer) and each hit's `record.id` / `record.metadata` come back
  intact.
- [ ] `topK` is honored: a query with `topK: k` returns AT MOST k results,
  best-first — never more, never unordered.
- [ ] Metadata `filter` works: a `query` carrying a `MetadataFilter` (e.g.
  `{ field: 'userId', operator: 'eq', value }`) returns only records matching
  the filter and never leaks non-matching ones.
- [ ] Collection/namespace ISOLATION: a `query` scoped to one `collection`
  never returns another collection's vectors — the multi-tenant boundary that
  keeps one user's private docs out of another's results. Confirm with two
  collections (or two owner ids) that a scoped query returns only its own.
- [ ] `delete` removes a record: after `delete({ collection, ids })` the
  vector stops appearing in `query` results (and `fetch` omits it).
- [ ] The feature built on the store returns MEANING-ranked results
  end-to-end in the UI — a semantic-search / RAG / related-items query
  surfaces the relevant items first, not a keyword or insertion-order match.
  This store does NOT embed text itself, so confirm it composes with
  `@molecule/api-ai-embeddings` (query text → embedding → `query`).
- [ ] Every `upsert` / `query` runs SERVER-SIDE — the provider/store key
  stays on the server and never ships in the browser bundle (the package is
  server-only; a client import throws by design).
