# @molecule/api-search-elasticsearch

Elasticsearch search provider for molecule.dev.

Implements the `SearchProvider` interface using the `@elastic/elasticsearch`
client. Supports full-text search, faceted filtering, bulk indexing, and
autocomplete suggestions.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-search'
import { provider } from '@molecule/api-search-elasticsearch'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-search-elasticsearch
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
    indexed: number;
    /**
     * Number of documents that failed to index.
     */
    failed: number;
    /**
     * Errors encountered during bulk indexing, keyed by document id.
     */
    errors: Record<string, string>;
}
```

#### `ElasticsearchOptions`

Configuration options for the Elasticsearch search provider.

```typescript
interface ElasticsearchOptions {
  /**
   * Elasticsearch node URL.
   *
   * @default process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200'
   */
  node?: string

  /**
   * Optional API key for authentication.
   *
   * @default process.env.ELASTICSEARCH_API_KEY
   */
  apiKey?: string

  /**
   * Optional username for basic authentication.
   *
   * @default process.env.ELASTICSEARCH_USERNAME
   */
  username?: string

  /**
   * Optional password for basic authentication.
   *
   * @default process.env.ELASTICSEARCH_PASSWORD
   */
  password?: string

  /**
   * Request timeout in milliseconds.
   *
   * @default 30000
   */
  requestTimeout?: number

  /**
   * Maximum number of retries for failed requests.
   *
   * @default 3
   */
  maxRetries?: number

  /**
   * Index name prefix to namespace indices.
   */
  indexPrefix?: string
}
```

#### `FacetCount`

A single facet count entry.

```typescript
interface FacetCount {
    /**
     * The facet value.
     */
    value: string;
    /**
     * Number of documents matching this facet value.
     */
    count: number;
}
```

#### `IndexDocument`

A document to be indexed in a bulk operation.

```typescript
interface IndexDocument {
    /**
     * Unique identifier for the document.
     */
    id: string;
    /**
     * The document fields and values.
     */
    document: Record<string, unknown>;
}
```

#### `IndexSchema`

Schema definition for a search index, describing the fields and their roles.

```typescript
interface IndexSchema {
    /**
     * Map of field names to their types.
     */
    fields: Record<string, FieldType>;
    /**
     * Fields that are searchable via full-text queries.
     */
    searchableFields?: string[];
    /**
     * Fields that can be used in filter expressions.
     */
    filterableFields?: string[];
    /**
     * Fields that can be used for sorting results.
     */
    sortableFields?: string[];
}
```

#### `SearchHit`

A single search result hit.

```typescript
interface SearchHit {
    /**
     * Document identifier.
     */
    id: string;
    /**
     * Relevance score.
     */
    score: number;
    /**
     * The matched document fields.
     */
    document: Record<string, unknown>;
    /**
     * Highlighted field snippets, keyed by field name.
     */
    highlights?: Record<string, string[]>;
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
    createIndex(name: string, schema?: IndexSchema): Promise<void>;
    /**
     * Deletes a search index and all its documents.
     *
     * @param name - Index name to delete.
     */
    deleteIndex(name: string): Promise<void>;
    /**
     * Indexes a single document.
     *
     * @param indexName - Target index name.
     * @param id - Unique document identifier.
     * @param document - The document fields and values.
     */
    index(indexName: string, id: string, document: Record<string, unknown>): Promise<void>;
    /**
     * Indexes multiple documents in a single operation.
     *
     * @param indexName - Target index name.
     * @param documents - Array of documents to index.
     * @returns Result with indexed/failed counts and errors.
     */
    bulkIndex(indexName: string, documents: IndexDocument[]): Promise<BulkIndexResult>;
    /**
     * Executes a full-text search query against an index.
     *
     * @param indexName - Index to search.
     * @param query - Search query with text, filters, pagination, etc.
     * @returns Search results with hits, total count, facets, and timing.
     */
    search(indexName: string, query: SearchQuery): Promise<SearchResult>;
    /**
     * Deletes a document from an index by id.
     *
     * @param indexName - Index containing the document.
     * @param id - Document identifier to delete.
     */
    delete(indexName: string, id: string): Promise<void>;
    /**
     * Returns typeahead/autocomplete suggestions for a partial query.
     *
     * @param indexName - Index to generate suggestions from.
     * @param query - Partial text to complete.
     * @param options - Suggestion options (limit, fields, fuzzy).
     * @returns Array of suggestions sorted by relevance.
     */
    suggest(indexName: string, query: string, options?: SuggestOptions): Promise<Suggestion[]>;
    /**
     * Retrieves a single document from an index by id.
     *
     * @param indexName - Index containing the document.
     * @param id - Document identifier.
     * @returns The document fields, or `null` if not found.
     */
    getDocument(indexName: string, id: string): Promise<Record<string, unknown> | null>;
}
```

#### `SearchQuery`

A full-text search query with optional filters, facets, sorting, and pagination.

```typescript
interface SearchQuery {
    /**
     * The search text.
     *
     * Empty or whitespace-only text is "browse" mode: bond implementations
     * MUST match ALL documents (subject to `filters`, `sort`, and pagination)
     * rather than erroring or returning zero hits. Every bundled bond
     * (Elasticsearch, Meilisearch, Typesense, PostgreSQL) follows this
     * contract, so swapping providers doesn't silently change what an empty
     * search box shows.
     */
    text: string;
    /**
     * Filter expressions to narrow results.
     */
    filters?: Record<string, unknown>;
    /**
     * Fields to compute facet counts for.
     */
    facets?: string[];
    /**
     * Sort fields and directions.
     */
    sort?: SortField[];
    /**
     * Page number (1-based).
     */
    page?: number;
    /**
     * Number of results per page.
     */
    perPage?: number;
    /**
     * Whether to include highlighted snippets in results.
     */
    highlight?: boolean;
}
```

#### `SearchResult`

The result of a search query, including hits, pagination, facets, and timing.

```typescript
interface SearchResult {
    /**
     * Matched documents.
     */
    hits: SearchHit[];
    /**
     * Total number of matching documents.
     */
    total: number;
    /**
     * Current page number.
     */
    page: number;
    /**
     * Number of results per page.
     */
    perPage: number;
    /**
     * Facet counts keyed by field name.
     */
    facets?: Record<string, FacetCount[]>;
    /**
     * Time taken to process the query in milliseconds.
     */
    processingTimeMs: number;
}
```

#### `SortField`

A field to sort search results by.

```typescript
interface SortField {
    /**
     * The field name to sort on.
     */
    field: string;
    /**
     * Sort direction.
     */
    direction: SortDirection;
}
```

#### `Suggestion`

A single autocomplete suggestion.

```typescript
interface Suggestion {
    /**
     * The suggested text.
     */
    text: string;
    /**
     * Relevance score for ranking suggestions.
     */
    score: number;
    /**
     * Optional highlighted version of the suggestion.
     */
    highlighted?: string;
}
```

#### `SuggestOptions`

Options for typeahead / autocomplete suggestions.

```typescript
interface SuggestOptions {
    /**
     * Maximum number of suggestions to return.
     */
    limit?: number;
    /**
     * Fields to generate suggestions from.
     */
    fields?: string[];
    /**
     * Whether to apply fuzzy matching.
     */
    fuzzy?: boolean;
}
```

### Types

#### `FieldType`

Field type for index schema definitions.

```typescript
type FieldType = 'text' | 'keyword' | 'number' | 'boolean' | 'date' | 'geo';
```

#### `SortDirection`

Sort direction for search results.

```typescript
type SortDirection = 'asc' | 'desc';
```

### Functions

#### `createProvider(options)`

Creates an Elasticsearch search provider instance.

```typescript
function createProvider(options?: ElasticsearchOptions): SearchProvider
```

- `options` — Provider configuration options.

**Returns:** A fully configured `SearchProvider` implementation.

### Constants

#### `provider`

Default lazily-initialized Elasticsearch search provider.
Uses environment variables for configuration.

```typescript
const provider: SearchProvider
```

## Core Interface
Implements `@molecule/api-search` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-search'
import { provider } from '@molecule/api-search-elasticsearch'

export function setupSearchElasticsearch(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-search` ^1.0.0

Provider-specific behavior to know before debugging:

- **Filters are exact `term` queries — declare filterable string fields as
  `keyword` in the `createIndex()` schema.** A `term` filter against a
  `text`-mapped field matches ZERO documents with no error, so
  `createIndex()` THROWS at schema-declaration time if a field is typed
  `'text'` and also listed in `filterableFields` — fix by changing that
  field to `'keyword'`, or split it into a `text` field for full-text
  search plus a separate `keyword` field for filtering. This only guards
  schema-declared fields; on a schema-LESS index (no `createIndex()`
  schema, Elasticsearch dynamic-maps every string to `text`), filter on
  the auto-generated sub-field instead: `filters: { 'category.keyword':
  'electronics' }`.
- **Empty/whitespace-only `SearchQuery.text` is "browse" mode** — matches
  ALL documents (filters/sort/pagination still apply, highlighting is
  skipped since there is no term to highlight), consistent with the core
  `SearchProvider` contract and the meilisearch/typesense bonds.
- **Writes are immediately searchable** — `index()`, `bulkIndex()`, and
  `delete()` use `refresh: 'wait_for'`, trading write latency for
  read-your-writes consistency.
- **`SearchResult.total` is capped at 10,000** for larger result sets unless
  the index/query changes `track_total_hits` — treat it as "at least N" past
  that point.
- Configuration comes from `ELASTICSEARCH_URL`, `ELASTICSEARCH_API_KEY`, or
  `ELASTICSEARCH_USERNAME`/`ELASTICSEARCH_PASSWORD` (or `createProvider()`
  options). With none set it targets `http://localhost:9200`. Unlike the
  meilisearch/typesense bonds, this bond does NOT register these keys with
  `@molecule/api-secrets` (it would need that package as a new dependency,
  which is out of scope here), so they never appear in a boot-time
  configuration report — but an unreachable node or bad credentials no
  longer surface as a bare `ECONNREFUSED`/401: every method call wraps
  connectivity and auth failures into an actionable error naming the
  env var to check.
