# @molecule/api-ai-vector-store

AI vector-store core interface for molecule.dev.

Defines the `AIVectorStoreProvider` contract — named collections of embedding
vectors with `upsert`, similarity `query` (metadata filters, `topK`,
`minScore`), `fetch`, and `delete` — plus the accessor (`setProvider`/
`getProvider`/`hasProvider`/`requireProvider`). Interface-only: bond a
provider package (`@molecule/api-ai-vector-store-pgvector`, `-pinecone`,
`-chroma`, or `-memory` for dev/tests).

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-ai-vector-store'
import { provider as memory } from '@molecule/api-ai-vector-store-memory'

// Wire at startup — memory for dev; swap to pgvector/pinecone when provisioned.
setProvider(memory)

const store = requireProvider()
await store.createCollection({ name: 'docs', dimension: 1536, metric: 'cosine' })
await store.upsert({
  collection: 'docs',
  records: [{ id: 'a', embedding: vec, content: 'PTO policy…', metadata: { userId: 'u1' } }],
})
const hits = await store.query({
  collection: 'docs',
  embedding: queryVec,
  topK: 5,
  filter: [{ field: 'userId', operator: 'eq', value: 'u1' }],
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-vector-store
```

## API

### Interfaces

#### `AIVectorStoreConfig`

Base configuration for vector store providers.

```typescript
interface AIVectorStoreConfig {
  /** Connection string or URL for the vector store. */
  connectionString?: string
  /** API key for managed vector store services. */
  apiKey?: string
  /** Additional provider-specific options. */
  [key: string]: unknown
}
```

#### `AIVectorStoreProvider`

AIVectorStore provider interface.

Each bond package (pgvector, Pinecone, Chroma, etc.) implements
this interface to provide vector database operations.

```typescript
interface AIVectorStoreProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Create a new collection/namespace for storing vectors.
   *
   * @param params - Collection creation parameters.
   */
  createCollection(params: CreateCollectionParams): Promise<void>

  /**
   * Delete a collection/namespace and all its vectors.
   *
   * @param name - Name of the collection to delete.
   */
  deleteCollection(name: string): Promise<void>

  /**
   * List all available collections.
   *
   * @returns Array of collection names.
   */
  listCollections(): Promise<string[]>

  /**
   * Upsert (insert or update) vector records into a collection.
   *
   * @param params - Upsert parameters including collection and records.
   */
  upsert(params: VectorUpsertParams): Promise<void>

  /**
   * Query for similar vectors using a query embedding.
   *
   * @param params - Query parameters including embedding, topK, and filters.
   * @returns Array of search results sorted by similarity (highest first).
   */
  query(params: VectorQueryParams): Promise<VectorSearchResult[]>

  /**
   * Fetch vector records by their IDs.
   *
   * @param params - Fetch parameters including collection and IDs.
   * @returns Array of found vector records (missing IDs are omitted).
   */
  fetch(params: VectorFetchParams): Promise<VectorRecord[]>

  /**
   * Delete vector records by their IDs.
   *
   * @param params - Delete parameters including collection and IDs.
   */
  delete(params: VectorDeleteParams): Promise<void>
}
```

#### `CreateCollectionParams`

Parameters for creating a collection/namespace.

```typescript
interface CreateCollectionParams {
  /** Name of the collection to create. */
  name: string
  /** Dimensionality of vectors in this collection. */
  dimension: number
  /** Distance metric for similarity search. Defaults to 'cosine'. */
  metric?: DistanceMetric
}
```

#### `VectorDeleteParams`

Parameters for deleting vectors.

```typescript
interface VectorDeleteParams {
  /** The collection/namespace to delete from. */
  collection: string
  /** IDs of vectors to delete. */
  ids: string[]
}
```

#### `VectorFetchParams`

Parameters for fetching vectors by ID.

```typescript
interface VectorFetchParams {
  /** The collection/namespace to fetch from. */
  collection: string
  /** IDs of vectors to fetch. */
  ids: string[]
}
```

#### `VectorQueryParams`

Parameters for similarity search queries.

```typescript
interface VectorQueryParams {
  /** The query embedding vector to find similar vectors for. */
  embedding: number[]
  /** Maximum number of results to return. Defaults to 10. */
  topK?: number
  /** Optional metadata filters to narrow results. */
  filter?: MetadataFilter[]
  /** Minimum similarity score threshold (0–1). Results below this are excluded. */
  minScore?: number
  /** The collection/namespace to query. */
  collection: string
}
```

#### `VectorRecord`

A stored vector record with its embedding, metadata, and optional content.

```typescript
interface VectorRecord {
  /** Unique identifier for this vector record. */
  id: string
  /** The embedding vector (array of floats). */
  embedding: number[]
  /** Arbitrary metadata associated with this vector. */
  metadata?: Record<string, unknown>
  /** Optional text content that produced this embedding. */
  content?: string
}
```

#### `VectorRecordInput`

Input for upserting a vector record. Same as VectorRecord but embedding is optional
when the store handles embedding generation internally.

```typescript
interface VectorRecordInput {
  /** Unique identifier for this vector record. */
  id: string
  /** The embedding vector (array of floats). */
  embedding: number[]
  /** Arbitrary metadata associated with this vector. */
  metadata?: Record<string, unknown>
  /** Optional text content that produced this embedding. */
  content?: string
}
```

#### `VectorSearchResult`

A result from a similarity search query.

```typescript
interface VectorSearchResult {
  /** The matched vector record. */
  record: VectorRecord
  /** Similarity score (higher is more similar, normalized 0–1 when possible). */
  score: number
}
```

#### `VectorUpsertParams`

Parameters for upserting vectors.

```typescript
interface VectorUpsertParams {
  /** The collection/namespace to upsert into. */
  collection: string
  /** Vector records to upsert. */
  records: VectorRecordInput[]
}
```

### Types

#### `DistanceMetric`

Distance metric for similarity calculations.

```typescript
type DistanceMetric = 'cosine' | 'euclidean' | 'inner_product'
```

#### `MetadataFilter`

Metadata filter operators for querying vectors.

```typescript
type MetadataFilter =
  | { field: string; operator: 'eq'; value: string | number | boolean }
  | { field: string; operator: 'ne'; value: string | number | boolean }
  | { field: string; operator: 'gt'; value: number }
  | { field: string; operator: 'gte'; value: number }
  | { field: string; operator: 'lt'; value: number }
  | { field: string; operator: 'lte'; value: number }
  | { field: string; operator: 'in'; value: (string | number)[] }
```

### Functions

#### `getProvider()`

Get the active vector store provider, or null if none is configured.

```typescript
function getProvider(): AIVectorStoreProvider | null
```

**Returns:** The current provider or null.

#### `hasProvider()`

Check whether a vector store provider is configured.

```typescript
function hasProvider(): boolean
```

**Returns:** True if a provider has been set.

#### `requireProvider()`

Get the active vector store provider, throwing if none is configured.

```typescript
function requireProvider(): AIVectorStoreProvider
```

**Returns:** The current provider.

#### `setProvider(provider)`

Set the active vector store provider.

```typescript
function setProvider(provider: AIVectorStoreProvider): void
```

- `provider` — The vector store provider to register.

## Available Providers

| Provider | Package |
|----------|---------|
| Ai Vector Store | `@molecule/api-ai-vector-store-chroma` |
| Ai Vector Store | `@molecule/api-ai-vector-store-memory` |
| Ai Vector Store | `@molecule/api-ai-vector-store-pgvector` |
| Ai Vector Store | `@molecule/api-ai-vector-store-pinecone` |

## Injection Notes

- **Wire it with THIS package's `setProvider()` — NOT `bond('ai-vector-store', …)`.**
  This core keeps its own singleton and does not read the `@molecule/api-bond`
  registry: a generic `bond(...)` call appears to succeed, but `requireProvider()`
  still throws at first use. Call `setProvider(...)` in the app's bond setup.
- **Pick the bond by what is actually provisioned.** `-memory` needs nothing but
  holds vectors in process memory (lost on restart — dev/tests only). `-pgvector`
  reuses the app's existing Postgres (`DATABASE_URL`) and provisions its own
  extension/tables. Managed stores (Pinecone, Chroma) require their service and
  key to actually exist — don't wire one on the assumption that it does.
- **This store does NOT embed.** `upsert` takes precomputed `embedding` vectors —
  pair it with `@molecule/api-ai-embeddings`, or use
  `@molecule/api-semantic-search` (composes both) / `@molecule/api-ai-rag`
  (grounded Q&A) instead of calling this directly.
- **One collection = one embedding model + dimension.** `createCollection` fixes
  `dimension`; upserting vectors from a different model/dimension corrupts search
  results (or throws). Re-embed the corpus when switching models.
- **Scope multi-tenant data.** Put the owner (user/tenant id) in `metadata` and
  filter on it in EVERY `query` (or use per-tenant collections) — a shared,
  unfiltered collection leaks one tenant's documents into another's results.
- `query` results are sorted by `score` (higher = more similar, 0–1 where
  possible); use `minScore` to drop weak matches rather than trusting `topK`
  alone.
