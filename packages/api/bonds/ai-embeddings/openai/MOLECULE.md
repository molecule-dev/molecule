# @molecule/api-ai-embeddings-openai

OpenAI ai-embeddings provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-embeddings-openai
```

## API

### Interfaces

#### `OpenaiEmbeddingsConfig`

Configuration for the OpenAI embeddings provider.

```typescript
interface OpenaiEmbeddingsConfig {
  /** OpenAI API key. Defaults to OPENAI_API_KEY env var. */
  apiKey?: string
  /** Default embedding model. Defaults to 'text-embedding-3-small'. */
  defaultModel?: string
  /** Base URL for the OpenAI API. Defaults to 'https://api.openai.com'. */
  baseUrl?: string
  /** Maximum number of texts per batch request. Defaults to 2048. */
  maxBatchSize?: number
  /** Default number of output dimensions (for text-embedding-3 models). */
  dimensions?: number
}
```

### Functions

#### `createProvider(config)`

Creates an OpenAI embeddings provider instance.

```typescript
function createProvider(config?: OpenaiEmbeddingsConfig): AIEmbeddingsProvider
```

- `config` — OpenAI-specific configuration (API key, model, base URL, dimensions).

**Returns:** An `AIEmbeddingsProvider` backed by the OpenAI Embeddings API.

### Constants

#### `provider`

The provider implementation.

```typescript
const provider: AIEmbeddingsProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-embeddings` >=1.0.0
