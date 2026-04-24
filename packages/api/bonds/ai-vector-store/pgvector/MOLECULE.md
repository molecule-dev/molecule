# @molecule/api-ai-vector-store-pgvector

Pgvector ai-vector-store-pgvector provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-vector-store-pgvector
```

## API

### Interfaces

#### `PgvectorConfig`

Configuration for the pgvector vector store provider.

```typescript
interface PgvectorConfig {
  /** PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/db`). Falls back to `DATABASE_URL` env var. */
  connectionString?: string
  /** Schema to use for vector store tables. Defaults to `'public'`. */
  schema?: string
  /** Table name prefix for vector store tables. Defaults to `'mol_vectors_'`. */
  tablePrefix?: string
  /** Default distance metric for new collections. Defaults to `'cosine'`. */
  defaultMetric?: DistanceMetric
  /** Connection pool size. Defaults to 5. */
  poolSize?: number
}
```

### Functions

#### `createProvider(config)`

Creates a pgvector vector store provider instance.

```typescript
function createProvider(config?: PgvectorConfig): PgvectorProvider
```

- `config` — PostgreSQL + pgvector configuration.

**Returns:** An `AIVectorStoreProvider` backed by PostgreSQL with pgvector.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-vector-store` >=1.0.0
