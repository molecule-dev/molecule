# @molecule/api-semantic-search

`@molecule/api-semantic-search` — semantic search over any document corpus.

Composes the `@molecule/api-ai-embeddings` and `@molecule/api-ai-vector-store`
bonds into a reusable "index a corpus, then semantically search it"
capability. Bond any embeddings + vector-store provider at startup, then:

## Quick Start

```ts
import { indexDocuments, search, removeDocuments } from '@molecule/api-semantic-search'

await indexDocuments({
  collection: 'docs',
  documents: [
    { id: 'a', text: 'Cats are feline animals.', metadata: { topic: 'animals' } },
    { id: 'b', text: 'Cars are fast vehicles.', metadata: { topic: 'vehicles' } },
  ],
})

const hits = await search({
  collection: 'docs',
  query: 'domestic feline pet',
  topK: 3,
  filter: [{ field: 'topic', operator: 'eq', value: 'animals' }],
})

await removeDocuments({ collection: 'docs', ids: ['a'] })
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-semantic-search @molecule/api-ai-embeddings @molecule/api-ai-vector-store
```

## API

### Interfaces

#### `IndexDocumentsParams`

Parameters for {@link indexDocuments}.

```typescript
interface IndexDocumentsParams {
  /** The collection/namespace to index the documents into. */
  collection: string
  /** The documents to embed and upsert. An empty array is a no-op. */
  documents: SemanticDocument[]
  /** Embedding model override (provider-specific). Falls back to the provider default. */
  model?: string
}
```

#### `IndexResult`

Result of {@link indexDocuments}.

```typescript
interface IndexResult {
  /** Number of documents embedded and upserted. */
  indexed: number
  /** Dimensionality of the embedding vectors (0 when no documents were indexed). */
  dimension: number
}
```

#### `RemoveDocumentsParams`

Parameters for {@link removeDocuments}.

```typescript
interface RemoveDocumentsParams {
  /** The collection/namespace to remove documents from. */
  collection: string
  /** Ids of the documents to remove. */
  ids: string[]
}
```

#### `SearchHit`

A single semantic-search hit.

```typescript
interface SearchHit {
  /** The matched document's id. */
  id: string
  /** Similarity score (higher is more similar). */
  score: number
  /** Metadata stored with the matched document, if any. */
  metadata?: Record<string, unknown>
  /** The matched document's original text, if the store retained it. */
  content?: string
}
```

#### `SearchParams`

Parameters for {@link search}.

```typescript
interface SearchParams {
  /** The collection/namespace to search within. */
  collection: string
  /** The natural-language query to embed and match against the corpus. */
  query: string
  /** Maximum number of results to return (provider default applies when omitted). */
  topK?: number
  /** Optional metadata filters to narrow results before scoring. */
  filter?: MetadataFilter[]
  /** Minimum similarity score threshold — hits below this are excluded. */
  minScore?: number
  /** Embedding model override (provider-specific). Falls back to the provider default. */
  model?: string
}
```

#### `SemanticDocument`

A single document to index into a semantic-search collection.

```typescript
interface SemanticDocument {
  /** Stable unique identifier for this document (used as the vector record id). */
  id: string
  /** The document's text — embedded and stored so it can be returned on a hit. */
  text: string
  /** Arbitrary metadata stored alongside the vector and usable as a search filter. */
  metadata?: Record<string, unknown>
}
```

### Functions

#### `indexDocuments(params)`

Embed a corpus of documents and upsert them into a vector-store collection,
creating the collection on first use.

When `documents` is empty this short-circuits and returns without touching
either provider. The embedding model is chosen via `model` when supplied,
otherwise the provider's `embedDocuments` default is used. The target
collection is ensured idempotently — it is only created if not already present.

```typescript
function indexDocuments(params: IndexDocumentsParams): Promise<IndexResult>
```

- `params` — The collection, documents, and optional embedding model.

**Returns:** The number of documents indexed and the embedding dimensionality.

#### `removeDocuments(params)`

Remove previously-indexed documents from a collection by their ids.

```typescript
function removeDocuments(params: RemoveDocumentsParams): Promise<void>
```

- `params` — The collection and the ids of the documents to remove.

**Returns:** A promise that resolves once the documents have been deleted.

#### `search(params)`

Semantically search an indexed collection: embed the query, then return the
most similar documents ranked by similarity.

The query is embedded with `model` when supplied, otherwise the provider's
`embedQuery` default. `topK`, `filter`, and `minScore` are forwarded to the
vector store to bound, narrow, and threshold the results respectively.

```typescript
function search(params: SearchParams): Promise<SearchHit[]>
```

- `params` — The collection, query text, and optional topK/filter/minScore/model.

**Returns:** The matching documents (id, score, metadata, content) ranked most-similar first.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-embeddings` >=1.0.0
- `@molecule/api-ai-vector-store` >=1.0.0

### Runtime Dependencies

- `@molecule/api-ai-embeddings`
- `@molecule/api-ai-vector-store`
