# @molecule/api-ai-embeddings-openai

OpenAI ai-embeddings provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-embeddings-openai @molecule/api-ai-embeddings @molecule/api-secrets
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

#### `aiEmbeddingsOpenaiSecretDefinitions`

Secret definitions required by the OpenAI embeddings bond.

```typescript
const aiEmbeddingsOpenaiSecretDefinitions: SecretDefinition[]
```

#### `provider`

The provider implementation.

```typescript
const provider: AIEmbeddingsProvider
```

## Core Interface
Implements `@molecule/api-ai-embeddings` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai-embeddings'
import { provider } from '@molecule/api-ai-embeddings-openai'

export function setupAiEmbeddingsOpenai(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-embeddings` >=1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `OPENAI_API_KEY` *(required)* — OpenAI API key
  - Setup: Create a secret key on the OpenAI platform (API keys page).
  - Get it here: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - Example: `sk-proj-...`

### Runtime Dependencies

- `@molecule/api-ai-embeddings`
- `@molecule/api-secrets`

Config: `OPENAI_API_KEY` (SERVER-side only) plus optional `defaultModel`
(default `text-embedding-3-small`; also supports `text-embedding-3-large`
and `text-embedding-ada-002`), `dimensions` (text-embedding-3 models only),
`maxBatchSize` (default 2048 inputs per request — larger arrays are batched
automatically), and a base URL override (`OPENAI_BASE_URL` env var or
`baseUrl`, for proxies/gateways).

Wire it with the core's `setProvider()` — NOT `bond('ai-embeddings', …)`:
the `@molecule/api-ai-embeddings` core keeps its own singleton and never
reads the bond registry (see the core's docs).

Unlike the chat AI bonds, a missing `OPENAI_API_KEY` does NOT fail fast —
the first embed call fails with the upstream 401. Validate the key at boot
if you want an actionable startup error.
