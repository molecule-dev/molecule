# @molecule/api-ai-vector-store-pinecone

Pinecone vector store provider for molecule.dev.

Maps molecule collections to Pinecone serverless indexes, providing
similarity search, metadata filtering, and batch upsert operations.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-ai-vector-store'
import { createProvider } from '@molecule/api-ai-vector-store-pinecone'

// This bond exports NO `provider` const — wire the factory (reads PINECONE_API_KEY):
setProvider(createProvider())
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-vector-store-pinecone @molecule/api-ai-vector-store @pinecone-database/pinecone
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

## Core Interface
Implements `@molecule/api-ai-vector-store` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-vector-store` >=1.0.0

### Environment Variables

- `PINECONE_API_KEY` *(required)* — Pinecone API key
  - Setup: Create an API key in the Pinecone console (API Keys page).
  - Get it here: [https://app.pinecone.io/](https://app.pinecone.io/)
  - Example: `pcsk_...`

### Runtime Dependencies

- `@molecule/api-ai-vector-store`
- `@pinecone-database/pinecone`

- Config: `PINECONE_API_KEY` (required, SERVER-side only) — the Pinecone SDK throws at
  `createProvider()` time when it is missing.
- **Collections are serverless indexes created on demand** (name prefix `mol-`) in
  `config.cloud`/`config.region` (defaults `aws`/`us-east-1` — set these for other
  regions; existing indexes are never moved). With `waitUntilReady` (default `true`)
  `createCollection` blocks until the index is live, which can take ~a minute — create
  collections at startup/provisioning time, not inside request handlers.
