# @molecule/api-ai-vector-store-chroma

ChromaDB vector store provider for molecule.dev.

Maps molecule collections to ChromaDB collections (default name prefix `mol_`)
with HNSW indexing for similarity search.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-ai-vector-store'
import { createProvider } from '@molecule/api-ai-vector-store-chroma'

// This bond exports NO `provider` const — wire the factory:
setProvider(createProvider({ host: 'localhost', port: 8000 }))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-vector-store-chroma @molecule/api-ai-vector-store chromadb
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

## Core Interface
Implements `@molecule/api-ai-vector-store` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-vector-store` >=1.0.0

### Environment Variables

- `CHROMA_API_KEY` *(optional)* — ChromaDB Cloud API key
  - Setup: Only needed for ChromaDB Cloud (or an auth-enabled server); self-hosted local Chroma runs keyless.

### Runtime Dependencies

- `@molecule/api-ai-vector-store`
- `chromadb`

- **Requires a reachable ChromaDB server** — this bond only speaks HTTP to one
  (default `http://localhost:8000`; run `chroma run` or the official docker image),
  or ChromaDB Cloud with `CHROMA_API_KEY` set (optional env fallback for
  `config.apiKey`) plus `ssl`/`tenant`/`database` config. There is no embedded mode.
- **Wiring**: no lazy `provider` export — `setProvider(createProvider(config?))`;
  for a zero-dependency store (tests/dev) use `@molecule/api-ai-vector-store-memory`.
