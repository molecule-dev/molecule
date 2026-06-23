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

#### `clampTopK(value)`

[M7-2] Coerce a requested `topK` into a bounded positive integer for SAFE interpolation into
the `LIMIT` clause (it is not a bound `$N` parameter). `topK` is typed `number`, but a caller
forwarding an untrusted value (e.g. `req.body.topK` cast to `any`) could otherwise inject SQL
or request an unbounded scan. Non-finite / `< 1` falls back to the default 10; capped at 10_000.

```typescript
function clampTopK(value: unknown): number
```

- `value` — The caller-supplied `topK` (untyped at runtime).

**Returns:** A safe integer in `[1, 10000]`.

#### `createProvider(config)`

Creates a pgvector vector store provider instance.

```typescript
function createProvider(config?: PgvectorConfig): PgvectorProvider
```

- `config` — PostgreSQL + pgvector configuration.

**Returns:** An `AIVectorStoreProvider` backed by PostgreSQL with pgvector.

## Core Interface
Implements `@molecule/api-ai-vector-store` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-vector-store` >=1.0.0
