# @molecule/api-ai-vector-store-memory

In-memory ai-vector-store provider for molecule.dev.

A brute-force-cosine vector store held entirely in process memory, with zero
external dependencies — ideal for small corpora, tests, and local development
(the pgvector / Pinecone / Chroma providers all need an external service). Bond
it once at startup, then use the `@molecule/api-ai-vector-store` core.

## Quick Start

```ts
import { setProvider, requireProvider } from '@molecule/api-ai-vector-store'
import { provider } from '@molecule/api-ai-vector-store-memory'

setProvider(provider) // at startup

const store = requireProvider()
await store.createCollection({ name: 'docs', dimension: 384, metric: 'cosine' })
await store.upsert({
  collection: 'docs',
  records: [{ id: 'a', embedding: vec, metadata: { topic: 'x' } }],
})
const hits = await store.query({ collection: 'docs', embedding: queryVec, topK: 5 })
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-vector-store-memory @molecule/api-ai-vector-store
```

## API

### Constants

#### `provider`

In-memory vector store provider.

Implements the `AIVectorStoreProvider` interface with process-local state and
a brute-force similarity scan. No persistence, no external services.

```typescript
const provider: AIVectorStoreProvider
```

## Core Interface
Implements `@molecule/api-ai-vector-store` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai-vector-store'
import { provider } from '@molecule/api-ai-vector-store-memory'

export function setupAiVectorStoreMemory(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-vector-store` >=1.0.0

### Runtime Dependencies

- `@molecule/api-ai-vector-store`

- **Not persistent** — the index lives in process memory and is gone on restart.
  Rebuild it at startup, or use a persistent provider (pgvector/Pinecone) for
  durable data.
- `upsert` throws if the collection doesn't exist, or if an embedding's length
  differs from the collection's dimension (validated before any write, so a bad
  batch leaves the collection unchanged).
- Query is O(n) per call (brute-force cosine) — great for thousands of vectors,
  not millions.

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
