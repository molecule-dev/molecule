# @molecule/api-search-postgres

PostgreSQL full-text search provider for molecule.dev.

Implements the `SearchProvider` interface using PostgreSQL's built-in
`tsvector`/`tsquery` full-text search capabilities. No external search
engine required — uses the existing database bond.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-search-postgres
```

## Usage

```typescript
import { setProvider } from '@molecule/api-search'
import { provider } from '@molecule/api-search-postgres'

setProvider(provider)
```

## API

### Interfaces

#### `PostgresSearchOptions`

Configuration options for the PostgreSQL search provider.

```typescript
interface PostgresSearchOptions {
  /**
   * PostgreSQL text search configuration (language).
   *
   * @default 'english'
   */
  searchConfig?: string

  /**
   * Table prefix for search index tables.
   *
   * @default 'search_'
   */
  tablePrefix?: string

  /**
   * Whether to use GIN indexes for faster text search.
   *
   * @default true
   */
  useGinIndex?: boolean
}
```

### Functions

#### `createProvider(options)`

Creates a PostgreSQL full-text search provider instance.

```typescript
function createProvider(options?: PostgresSearchOptions): SearchProvider
```

- `options` — Provider configuration options.

**Returns:** A fully configured `SearchProvider` implementation.

### Constants

#### `provider`

Default lazily-initialized PostgreSQL search provider.
Uses the bonded database pool for queries.

```typescript
const provider: SearchProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-search` ^1.0.0
