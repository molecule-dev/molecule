# @molecule/api-ai-vector-store-pinecone

Pinecone vector store provider for molecule.dev.

Maps molecule collections to Pinecone serverless indexes, providing
similarity search, metadata filtering, and batch upsert operations.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-vector-store-pinecone
```

## API

### Interfaces

#### `PineconeConfig`

Configuration for the Pinecone vector store provider.

```typescript
interface PineconeConfig {
  /** Pinecone API key. Falls back to `PINECONE_API_KEY` env var. */
  apiKey?: string
  /** Cloud provider for serverless indexes. Defaults to `'aws'`. */
  cloud?: 'aws' | 'gcp' | 'azure'
  /** Cloud region for serverless indexes. Defaults to `'us-east-1'`. */
  region?: string
  /** Prefix for Pinecone index names (collections map to indexes). Defaults to `'mol-'`. */
  indexPrefix?: string
  /** Default distance metric for new collections. Defaults to `'cosine'`. */
  defaultMetric?: DistanceMetric
  /** Whether to wait for index readiness after creation. Defaults to `true`. */
  waitUntilReady?: boolean
}
```

### Functions

#### `createProvider(config)`

Creates a Pinecone vector store provider instance.

```typescript
function createProvider(config?: PineconeConfig): AIVectorStoreProvider
```

- `config` — Pinecone configuration.

**Returns:** An `AIVectorStoreProvider` backed by Pinecone.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-vector-store` >=1.0.0
