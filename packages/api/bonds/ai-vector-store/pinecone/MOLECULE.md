# @molecule/api-ai-vector-store-pinecone

Pinecone vector store provider for molecule.dev.

Maps molecule collections to Pinecone serverless indexes, providing
similarity search, metadata filtering, and batch upsert operations.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-ai-vector-store'
import { provider } from '@molecule/api-ai-vector-store-pinecone'

setProvider(provider) // at startup — lazy; reads PINECONE_API_KEY on first use
// or pass explicit config: setProvider(createProvider({ apiKey }))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-vector-store-pinecone @molecule/api-ai-vector-store @pinecone-database/pinecone
```

## API

### Interfaces

#### `PineconeConfig`

Configuration for the Pinecone vector store provider.

```typescript
interface PineconeConfig {
  /** Pinecone API key. Falls back to `PINECONE_API_KEY` env var. */
  apiKey?: string
  /** Cloud provider for serverless indexes. Defaults to `'aws'`. */
  cloud?: 'aws' | 'gcp' | 'azure'
  /** Cloud region for serverless indexes. Defaults to `'us-east-1'`. */
  region?: string
  /** Prefix for Pinecone index names (collections map to indexes). Defaults to `'mol-'`. */
  indexPrefix?: string
  /** Default distance metric for new collections. Defaults to `'cosine'`. */
  defaultMetric?: DistanceMetric
  /** Whether to wait for index readiness after creation. Defaults to `true`. */
  waitUntilReady?: boolean
}
```

### Functions

#### `createProvider(config)`

Creates a Pinecone vector store provider instance.

```typescript
function createProvider(config?: PineconeConfig): AIVectorStoreProvider
```

- `config` — Pinecone configuration.

**Returns:** An `AIVectorStoreProvider` backed by Pinecone.

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
import { provider } from '@molecule/api-ai-vector-store-pinecone'

export function setupAiVectorStorePinecone(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-vector-store` >=1.0.0

### Environment Variables

- `PINECONE_API_KEY` *(required)* — Pinecone API key
  - Setup: Create an API key in the Pinecone console (API Keys page).
  - Get it here: [https://app.pinecone.io/](https://app.pinecone.io/)
  - Example: `pcsk_...`

### Runtime Dependencies

- `@molecule/api-ai-vector-store`
- `@pinecone-database/pinecone`

- Config: `PINECONE_API_KEY` (required, SERVER-side only) — the Pinecone SDK throws at
  construction time when it is missing. The exported `provider` is a lazy proxy, so this
  fires on first use, NOT at import time; `createProvider()` throws eagerly.
- **Collections are serverless indexes created on demand** (name prefix `mol-`) in
  `config.cloud`/`config.region` (defaults `aws`/`us-east-1` — set these for other
  regions; existing indexes are never moved). With `waitUntilReady` (default `true`)
  `createCollection` blocks until the index is live, which can take ~a minute — create
  collections at startup/provisioning time, not inside request handlers.

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
