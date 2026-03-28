# @molecule/api-search-typesense

Typesense search provider for molecule.dev.

Implements the `SearchProvider` interface using the `typesense` client.
Supports full-text search, faceted filtering, bulk indexing, and
autocomplete suggestions.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-search-typesense
```

## Usage

```typescript
import { setProvider } from '@molecule/api-search'
import { provider } from '@molecule/api-search-typesense'

setProvider(provider)
```

## API

### Interfaces

#### `TypesenseOptions`

Configuration options for the Typesense search provider.

```typescript
interface TypesenseOptions {
  /**
   * Typesense node URL(s).
   *
   * @default [{ host: process.env.TYPESENSE_HOST ?? 'localhost', port: Number(process.env.TYPESENSE_PORT ?? 8108), protocol: process.env.TYPESENSE_PROTOCOL ?? 'http' }]
   */
  nodes?: Array<{ host: string; port: number; protocol: string }>

  /**
   * Typesense API key for authentication.
   *
   * @default process.env.TYPESENSE_API_KEY
   */
  apiKey?: string

  /**
   * Connection timeout in milliseconds.
   *
   * @default 5000
   */
  connectionTimeoutSeconds?: number

  /**
   * Number of retries for failed requests.
   *
   * @default 3
   */
  numRetries?: number
}
```

### Functions

#### `createProvider(options)`

Creates a Typesense search provider instance.

```typescript
function createProvider(options?: TypesenseOptions): SearchProvider
```

- `options` — Provider configuration options.

**Returns:** A fully configured `SearchProvider` implementation.

### Constants

#### `provider`

Default lazily-initialized Typesense search provider.
Uses environment variables for configuration.

```typescript
const provider: SearchProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-search` ^1.0.0
