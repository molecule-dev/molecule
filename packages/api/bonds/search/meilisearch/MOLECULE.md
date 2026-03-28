# @molecule/api-search-meilisearch

Meilisearch search provider for molecule.dev.

Implements the `SearchProvider` interface using the `meilisearch` client.
Supports full-text search, faceted filtering, bulk indexing, and
autocomplete suggestions.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-search-meilisearch
```

## Usage

```typescript
import { setProvider } from '@molecule/api-search'
import { provider } from '@molecule/api-search-meilisearch'

setProvider(provider)
```

## API

### Interfaces

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
}
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-search` ^1.0.0
