# @molecule/api-search-elasticsearch

Elasticsearch search provider for molecule.dev.

Implements the `SearchProvider` interface using the `@elastic/elasticsearch`
client. Supports full-text search, faceted filtering, bulk indexing, and
autocomplete suggestions.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-search-elasticsearch
```

## Usage

```typescript
import { setProvider } from '@molecule/api-search'
import { provider } from '@molecule/api-search-elasticsearch'

setProvider(provider)
```

## API

### Interfaces

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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-search` ^1.0.0
