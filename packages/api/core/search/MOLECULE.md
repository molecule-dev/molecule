# @molecule/api-search

Provider-agnostic full-text search interface for molecule.dev.

Defines the `SearchProvider` interface for indexing, querying, and
autocomplete suggestions. Bond packages (Elasticsearch, Meilisearch,
Typesense, PostgreSQL, etc.) implement this interface. Application code
uses the convenience functions (`search`, `index`, `suggest`, etc.) which
delegate to the bonded provider.

## Quick Start

```typescript
import { setProvider, search, index, suggest } from '@molecule/api-search'
import { provider as elasticsearch } from '@molecule/api-search-elasticsearch'

setProvider(elasticsearch)
await index('products', '1', { name: 'Widget', price: 9.99 })
const results = await search('products', { text: 'widget', highlight: true })
const suggestions = await suggest('products', 'wid', { limit: 5 })
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-search
```

## API

### Interfaces

#### `BulkIndexResult`

Result of a bulk index operation.

```typescript
interface BulkIndexResult {
  /**
   * Number of documents successfully indexed.
   */
  indexed: number

  /**
   * Number of documents that failed to index.
   */
  failed: number

  /**
   * Errors encountered during bulk indexing, keyed by document id.
   */
  errors: Record<string, string>
}
```

#### `FacetCount`

A single facet count entry.

```typescript
interface FacetCount {
  /**
   * The facet value.
   */
  value: string

  /**
   * Number of documents matching this facet value.
   */
  count: number
}
```

#### `IndexDocument`

A document to be indexed in a bulk operation.

```typescript
interface IndexDocument {
  /**
   * Unique identifier for the document.
   */
  id: string

  /**
   * The document fields and values.
   */
  document: Record<string, unknown>
}
```

#### `IndexSchema`

Schema definition for a search index, describing the fields and their roles.

```typescript
interface IndexSchema {
  /**
   * Map of field names to their types.
   */
  fields: Record<string, FieldType>

  /**
   * Fields that are searchable via full-text queries.
   */
  searchableFields?: string[]

  /**
   * Fields that can be used in filter expressions.
   */
  filterableFields?: string[]

  /**
   * Fields that can be used for sorting results.
   */
  sortableFields?: string[]
}
```

#### `SearchHit`

A single search result hit.

```typescript
interface SearchHit {
  /**
   * Document identifier.
   */
  id: string

  /**
   * Relevance score.
   */
  score: number

  /**
   * The matched document fields.
   */
  document: Record<string, unknown>

  /**
   * Highlighted field snippets, keyed by field name.
   */
  highlights?: Record<string, string[]>
}
```

#### `SearchProvider`

Search provider interface.

All search providers must implement this interface to provide full-text
search, indexing, and suggestion capabilities.

```typescript
interface SearchProvider {
  /**
   * Creates a search index with an optional schema.
   *
   * @param name - Index name.
   * @param schema - Optional schema describing field types and roles.
   */
  createIndex(name: string, schema?: IndexSchema): Promise<void>

  /**
   * Deletes a search index and all its documents.
   *
   * @param name - Index name to delete.
   */
  deleteIndex(name: string): Promise<void>

  /**
   * Indexes a single document.
   *
   * @param indexName - Target index name.
   * @param id - Unique document identifier.
   * @param document - The document fields and values.
   */
  index(indexName: string, id: string, document: Record<string, unknown>): Promise<void>

  /**
   * Indexes multiple documents in a single operation.
   *
   * @param indexName - Target index name.
   * @param documents - Array of documents to index.
   * @returns Result with indexed/failed counts and errors.
   */
  bulkIndex(indexName: string, documents: IndexDocument[]): Promise<BulkIndexResult>

  /**
   * Executes a full-text search query against an index.
   *
   * @param indexName - Index to search.
   * @param query - Search query with text, filters, pagination, etc.
   * @returns Search results with hits, total count, facets, and timing.
   */
  search(indexName: string, query: SearchQuery): Promise<SearchResult>

  /**
   * Deletes a document from an index by id.
   *
   * @param indexName - Index containing the document.
   * @param id - Document identifier to delete.
   */
  delete(indexName: string, id: string): Promise<void>

  /**
   * Returns typeahead/autocomplete suggestions for a partial query.
   *
   * @param indexName - Index to generate suggestions from.
   * @param query - Partial text to complete.
   * @param options - Suggestion options (limit, fields, fuzzy).
   * @returns Array of suggestions sorted by relevance.
   */
  suggest(indexName: string, query: string, options?: SuggestOptions): Promise<Suggestion[]>

  /**
   * Retrieves a single document from an index by id.
   *
   * @param indexName - Index containing the document.
   * @param id - Document identifier.
   * @returns The document fields, or `null` if not found.
   */
  getDocument(indexName: string, id: string): Promise<Record<string, unknown> | null>
}
```

#### `SearchQuery`

A full-text search query with optional filters, facets, sorting, and pagination.

```typescript
interface SearchQuery {
  /**
   * The search text.
   */
  text: string

  /**
   * Filter expressions to narrow results.
   */
  filters?: Record<string, unknown>

  /**
   * Fields to compute facet counts for.
   */
  facets?: string[]

  /**
   * Sort fields and directions.
   */
  sort?: SortField[]

  /**
   * Page number (1-based).
   */
  page?: number

  /**
   * Number of results per page.
   */
  perPage?: number

  /**
   * Whether to include highlighted snippets in results.
   */
  highlight?: boolean
}
```

#### `SearchResult`

The result of a search query, including hits, pagination, facets, and timing.

```typescript
interface SearchResult {
  /**
   * Matched documents.
   */
  hits: SearchHit[]

  /**
   * Total number of matching documents.
   */
  total: number

  /**
   * Current page number.
   */
  page: number

  /**
   * Number of results per page.
   */
  perPage: number

  /**
   * Facet counts keyed by field name.
   */
  facets?: Record<string, FacetCount[]>

  /**
   * Time taken to process the query in milliseconds.
   */
  processingTimeMs: number
}
```

#### `SortField`

A field to sort search results by.

```typescript
interface SortField {
  /**
   * The field name to sort on.
   */
  field: string

  /**
   * Sort direction.
   */
  direction: SortDirection
}
```

#### `Suggestion`

A single autocomplete suggestion.

```typescript
interface Suggestion {
  /**
   * The suggested text.
   */
  text: string

  /**
   * Relevance score for ranking suggestions.
   */
  score: number

  /**
   * Optional highlighted version of the suggestion.
   */
  highlighted?: string
}
```

#### `SuggestOptions`

Options for typeahead / autocomplete suggestions.

```typescript
interface SuggestOptions {
  /**
   * Maximum number of suggestions to return.
   */
  limit?: number

  /**
   * Fields to generate suggestions from.
   */
  fields?: string[]

  /**
   * Whether to apply fuzzy matching.
   */
  fuzzy?: boolean
}
```

### Types

#### `FieldType`

Field type for index schema definitions.

```typescript
type FieldType = 'text' | 'keyword' | 'number' | 'boolean' | 'date' | 'geo'
```

#### `SortDirection`

Sort direction for search results.

```typescript
type SortDirection = 'asc' | 'desc'
```

### Functions

#### `bulkIndex(indexName, documents)`

Indexes multiple documents in a single operation.

```typescript
function bulkIndex(indexName: string, documents: IndexDocument[]): Promise<BulkIndexResult>
```

- `indexName` — Target index name.
- `documents` — Array of documents to index.

**Returns:** Result with indexed/failed counts and errors.

#### `createIndex(name, schema)`

Creates a search index with an optional schema.

```typescript
function createIndex(name: string, schema?: IndexSchema): Promise<void>
```

- `name` — Index name.
- `schema` — Optional schema describing field types and roles.

**Returns:** A promise that resolves when the index has been created.

#### `deleteDocument(indexName, id)`

Deletes a document from an index by id.

```typescript
function deleteDocument(indexName: string, id: string): Promise<void>
```

- `indexName` — Index containing the document.
- `id` — Document identifier to delete.

**Returns:** A promise that resolves when the document has been deleted.

#### `deleteIndex(name)`

Deletes a search index and all its documents.

```typescript
function deleteIndex(name: string): Promise<void>
```

- `name` — Index name to delete.

**Returns:** A promise that resolves when the index has been deleted.

#### `getDocument(indexName, id)`

Retrieves a single document from an index by id.

```typescript
function getDocument(indexName: string, id: string): Promise<Record<string, unknown> | null>
```

- `indexName` — Index containing the document.
- `id` — Document identifier.

**Returns:** The document fields, or `null` if not found.

#### `getProvider()`

Retrieves the bonded search provider, throwing if none is configured.

```typescript
function getProvider(): SearchProvider
```

**Returns:** The bonded search provider.

#### `hasProvider()`

Checks whether a search provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a search provider is bonded.

#### `index(indexName, id, document)`

Indexes a single document.

```typescript
function index(indexName: string, id: string, document: Record<string, unknown>): Promise<void>
```

- `indexName` — Target index name.
- `id` — Unique document identifier.
- `document` — The document fields and values.

**Returns:** A promise that resolves when the document has been indexed.

#### `search(indexName, query)`

Executes a full-text search query against an index.

```typescript
function search(indexName: string, query: SearchQuery): Promise<SearchResult>
```

- `indexName` — Index to search.
- `query` — Search query with text, filters, pagination, etc.

**Returns:** Search results with hits, total count, facets, and timing.

#### `setProvider(provider)`

Registers a search provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: SearchProvider): void
```

- `provider` — The search provider implementation to bond.

#### `suggest(indexName, query, options)`

Returns typeahead/autocomplete suggestions for a partial query.

```typescript
function suggest(indexName: string, query: string, options?: SuggestOptions): Promise<Suggestion[]>
```

- `indexName` — Index to generate suggestions from.
- `query` — Partial text to complete.
- `options` — Suggestion options (limit, fields, fuzzy).

**Returns:** Array of suggestions sorted by relevance.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
