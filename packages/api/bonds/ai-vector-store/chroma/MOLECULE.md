# @molecule/api-ai-vector-store-chroma

ChromaDB vector store provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-vector-store-chroma
```

## API

### Interfaces

#### `ChromaConfig`

Configuration for the ChromaDB vector store provider.

```typescript
interface ChromaConfig {
  /** ChromaDB server host. Defaults to `'localhost'`. */
  host?: string
  /** ChromaDB server port. Defaults to `8000`. */
  port?: number
  /** Whether to use SSL/HTTPS. Defaults to `false`. */
  ssl?: boolean
  /** API key or auth token for ChromaDB Cloud. Falls back to `CHROMA_API_KEY` env var. */
  apiKey?: string
  /** Tenant name. Defaults to `'default_tenant'`. */
  tenant?: string
  /** Database name. Defaults to `'default_database'`. */
  database?: string
  /** Prefix for collection names to avoid conflicts. Defaults to `'mol_'`. */
  collectionPrefix?: string
  /** Default distance metric for new collections. Defaults to `'cosine'`. */
  defaultMetric?: DistanceMetric
}
```

### Functions

#### `createProvider(config)`

Creates a ChromaDB vector store provider instance.

```typescript
function createProvider(config?: ChromaConfig): AIVectorStoreProvider
```

- `config` — ChromaDB configuration.

**Returns:** An `AIVectorStoreProvider` backed by ChromaDB.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-vector-store` >=1.0.0
