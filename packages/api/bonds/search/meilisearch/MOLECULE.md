# @molecule/api-search-meilisearch

Meilisearch search provider for molecule.dev.

Implements the `SearchProvider` interface using the `meilisearch` client.
Supports full-text search, faceted filtering, bulk indexing, and
autocomplete suggestions.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-search'
import { provider } from '@molecule/api-search-meilisearch'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-search-meilisearch @molecule/api-search @molecule/api-secrets meilisearch
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

#### `MeilisearchOptions`

Configuration options for the Meilisearch search provider.

```typescript
interface MeilisearchOptions {
  /**
   * Meilisearch host URL.
   *
   * @default process.env.MEILISEARCH_URL ?? 'http://localhost:7700'
   */
  host?: string

  /**
   * Meilisearch API key for authentication.
   *
   * @default process.env.MEILISEARCH_API_KEY
   */
  apiKey?: string

  /**
   * How long (in milliseconds) to wait for a Meilisearch task (index/delete/
   * settings write) to finish before throwing a timeout error. The meilisearch
   * client's own default of 5000 ms routinely times out on realistic bulk
   * indexing, so this provider defaults to 30000 ms. Set `0` to wait forever.
   *
   * @default 30000
   */
  taskTimeoutMs?: number
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

Creates a Meilisearch search provider instance.

```typescript
function createProvider(options?: MeilisearchOptions): SearchProvider
```

- `options` — Provider configuration options.

**Returns:** A fully configured `SearchProvider` implementation.

### Constants

#### `provider`

Default lazily-initialized Meilisearch search provider.
Uses environment variables for configuration.

```typescript
const provider: SearchProvider
```

#### `searchMeilisearchSecretDefinitions`

Secret definitions required by the Meilisearch search bond.

```typescript
const searchMeilisearchSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-search` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-search'
import { provider } from '@molecule/api-search-meilisearch'

export function setupSearchMeilisearch(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-search` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `MEILISEARCH_URL` *(optional)* — Meilisearch URL — default: `http://localhost:7700`
  - **Provisioned automatically in molecule.dev sandboxes** — manual setup only needed outside the platform.
  - Setup: Origin of your Meilisearch instance. molecule.dev runs Meilisearch inside your app's container automatically (dev and production) — set this only to use an external/managed instance; locally, run the official meilisearch Docker container or binary.
  - Example: `http://localhost:7700`
- `MEILISEARCH_API_KEY` *(optional)* — Meilisearch API key
  - **Provisioned automatically in molecule.dev sandboxes** — manual setup only needed outside the platform.
  - Setup: The master key (or a scoped API key) you configured when launching Meilisearch (--master-key / MEILI_MASTER_KEY). Optional for keyless local or in-container instances.

### Runtime Dependencies

- `@molecule/api-search`
- `@molecule/api-secrets`
- `meilisearch`

Provider-specific behavior to know before debugging:

- **Write operations wait for the Meilisearch task and THROW if it failed**,
  with the Meilisearch error code in the message (e.g.
  `index_already_exists`, `index_not_found`, `invalid_document_fields`) —
  so `createIndex()` on an existing index and `deleteIndex()` on a missing
  one are errors you can tell apart, and a rejected document is never
  silently reported as indexed. Task waiting times out after
  `taskTimeoutMs` (default 30 s) — a timeout means "still processing",
  not "failed".
- **Filtering requires filterable attributes.** Pass `filterableFields` in the
  `createIndex()` schema (or the filter errors with `invalid_search_filter`).
  Filters compare as `field = "value"` string equality; values are escaped, so
  quotes in data are safe.
- **`SearchHit.score` is Meilisearch's `_rankingScore`** (requested
  automatically). `SearchResult.total` is Meilisearch's `estimatedTotalHits` —
  an estimate, suitable for pagination but not for exact counts.
- **Empty search text matches ALL documents** (Meilisearch placeholder search),
  per the core `SearchQuery.text` browse-mode contract — consistent with every
  bundled search bond.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Searching a term that exists in seeded data returns the matching records
  in the results UI.
- [ ] An empty search box shows the browse-everything view (empty `text` matches
  ALL documents by contract) — not zero results and not an error.
- [ ] A term with no matches shows a clear "no results" state.
- [ ] Index-on-write is wired: create a new record through the UI, then search
  for it — it must be findable without a manual reindex.
- [ ] If autocomplete/suggestions are surfaced, typing a prefix of a known
  record shows relevant suggestions.
- [ ] Search is scoped to the caller: one user's search never returns another
  user's private records.
