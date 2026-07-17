# @molecule/api-ai-vector-store-chroma

ChromaDB vector store provider for molecule.dev.

Maps molecule collections to ChromaDB collections (default name prefix `mol_`)
with HNSW indexing for similarity search.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-ai-vector-store'
import { provider } from '@molecule/api-ai-vector-store-chroma'

setProvider(provider) // at startup — lazy; connects to the ChromaDB server on first use
// or pass explicit config: setProvider(createProvider({ host: 'localhost', port: 8000 }))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-vector-store-chroma @molecule/api-ai-vector-store chromadb
```

## API

### Interfaces

#### `ChromaConfig`

Configuration for the ChromaDB vector store provider.

```typescript
interface ChromaConfig {
  /** ChromaDB server host. Defaults to `'localhost'`. */
  host?: string
  /** ChromaDB server port. Defaults to `8000`. */
  port?: number
  /** Whether to use SSL/HTTPS. Defaults to `false`. */
  ssl?: boolean
  /** API key or auth token for ChromaDB Cloud. Falls back to `CHROMA_API_KEY` env var. */
  apiKey?: string
  /** Tenant name. Defaults to `'default_tenant'`. */
  tenant?: string
  /** Database name. Defaults to `'default_database'`. */
  database?: string
  /** Prefix for collection names to avoid conflicts. Defaults to `'mol_'`. */
  collectionPrefix?: string
  /** Default distance metric for new collections. Defaults to `'cosine'`. */
  defaultMetric?: DistanceMetric
}
```

### Functions

#### `createProvider(config)`

Creates a ChromaDB vector store provider instance.

```typescript
function createProvider(config?: ChromaConfig): AIVectorStoreProvider
```

- `config` — ChromaDB configuration.

**Returns:** An `AIVectorStoreProvider` backed by ChromaDB.

### Constants

#### `provider`

The provider implementation.

```typescript
const provider: AIVectorStoreProvider
```

## Core Interface
Implements `@molecule/api-ai-vector-store` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai-vector-store'
import { provider } from '@molecule/api-ai-vector-store-chroma'

export function setupAiVectorStoreChroma(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-vector-store` >=1.0.0

### Environment Variables

- `CHROMA_API_KEY` *(optional)* — ChromaDB Cloud API key
  - Setup: Only needed for ChromaDB Cloud (or an auth-enabled server); self-hosted local Chroma runs keyless.

### Runtime Dependencies

- `@molecule/api-ai-vector-store`
- `chromadb`

- **Requires a reachable ChromaDB server** — this bond only speaks HTTP to one
  (default `http://localhost:8000`; run `chroma run` or the official docker image),
  or ChromaDB Cloud with `CHROMA_API_KEY` set (optional env fallback for
  `config.apiKey`) plus `ssl`/`tenant`/`database` config. There is no embedded mode.
- **Wiring**: bond the lazy `provider` export once — `setProvider(provider)` — or
  `setProvider(createProvider(config?))` to pass explicit config; for a
  zero-dependency store (tests/dev) use `@molecule/api-ai-vector-store-memory`.

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
