# @molecule/api-ai-embeddings

AI text-embeddings core interface for molecule.dev.

Defines the `AIEmbeddingsProvider` contract — turn text into vectors for
semantic search, clustering, deduplication, and similarity scoring
(`embed`, `embedQuery`, `embedDocuments`) — plus the accessor
(`setProvider`/`getProvider`/`hasProvider`/`requireProvider`). Interface-only:
bond a provider package (e.g. `@molecule/api-ai-embeddings-openai`, or
`@molecule/api-ai-embeddings-local` for keyless local inference).

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/api-ai-embeddings'
import { createProvider } from '@molecule/api-ai-embeddings-openai'

// Wire at startup. See the bond package for its config/env (e.g. OPENAI_API_KEY).
setProvider(createProvider({ defaultModel: 'text-embedding-3-small' }))

// Use anywhere after startup.
const { embeddings, usage } = await requireProvider().embed({
  input: ['How do I reset my password?', 'Billing and invoices'],
})
const queryVector = await requireProvider().embedQuery('forgot my password')
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-embeddings
```

## API

### Interfaces

#### `AIEmbeddingsConfig`

Base configuration for embeddings providers.

```typescript
interface AIEmbeddingsConfig {
  /** API key for the embeddings service. */
  apiKey?: string
  /** Default model to use. */
  defaultModel?: string
  /** Base URL override (for proxies or self-hosted endpoints). */
  baseUrl?: string
  /** Additional provider-specific options. */
  [key: string]: unknown
}
```

#### `AIEmbeddingsProvider`

AIEmbeddings provider interface.

Providers generate vector embeddings from text, enabling
semantic search, clustering, and similarity comparisons.

```typescript
interface AIEmbeddingsProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Generate embeddings for one or more text inputs.
   *
   * @param params - Embedding parameters including input text(s), model, and dimensions.
   * @returns Embedding vectors with usage metadata.
   */
  embed(params: EmbedParams): Promise<EmbeddingResult>

  /**
   * Generate a single embedding vector for a query string.
   * Convenience method equivalent to `embed({ input: text })` returning the first vector.
   *
   * @param text - The query text to embed.
   * @returns A single embedding vector.
   */
  embedQuery(text: string): Promise<number[]>

  /**
   * Generate embedding vectors for multiple documents in batch.
   * Convenience method equivalent to `embed({ input: texts })` returning all vectors.
   *
   * @param texts - The document texts to embed.
   * @returns An array of embedding vectors, one per document.
   */
  embedDocuments(texts: string[]): Promise<number[][]>
}
```

#### `EmbeddingResult`

Result of an embedding request.

```typescript
interface EmbeddingResult {
  /** The embedding vectors, one per input text. */
  embeddings: number[][]
  /** Model that produced the embeddings. */
  model: string
  /** Token usage information. */
  usage: EmbeddingUsage
}
```

#### `EmbeddingUsage`

Token usage information for an embedding request.

```typescript
interface EmbeddingUsage {
  /** Number of prompt tokens consumed. */
  promptTokens: number
  /** Total tokens consumed. */
  totalTokens: number
}
```

#### `EmbedParams`

Parameters for generating embeddings.

```typescript
interface EmbedParams {
  /** Text or array of texts to embed. */
  input: string | string[]
  /** Model to use for embedding (provider-specific). */
  model?: string
  /** Number of dimensions for the output vectors (if supported by model). */
  dimensions?: number
}
```

### Functions

#### `getProvider()`

Returns the bonded AI embeddings provider, or `null` if none is registered.

```typescript
function getProvider(): AIEmbeddingsProvider | null
```

**Returns:** The active provider, or `null`.

#### `hasProvider()`

Returns whether an AI embeddings provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a provider is bonded.

#### `requireProvider()`

Returns the bonded AI embeddings provider, throwing if none is configured.

```typescript
function requireProvider(): AIEmbeddingsProvider
```

**Returns:** The active provider.

#### `setProvider(provider)`

Registers the AI embeddings provider singleton.

```typescript
function setProvider(provider: AIEmbeddingsProvider): void
```

- `provider` — The AI embeddings provider implementation to register.

## Available Providers

| Provider | Package |
|----------|---------|
| Ai Embeddings | `@molecule/api-ai-embeddings-local` |
| Ai Embeddings | `@molecule/api-ai-embeddings-openai` |

## Injection Notes

- **Wire it with THIS package's `setProvider()` — NOT `bond('ai-embeddings', …)`.**
  This core keeps its own singleton and does not read the `@molecule/api-bond`
  registry: a generic `bond('ai-embeddings', provider)` call appears to succeed,
  but `requireProvider()` still throws "not configured" at first use. Call
  `setProvider(...)` in the app's bond setup instead.
- **Vectors are only comparable within ONE model + dimension.** Never mix
  embeddings from different models (or `dimensions` settings) in the same
  collection/index — record which model produced a vector and re-embed the corpus
  when switching models.
- **Batch, don't loop.** Use `embed({ input: texts })` / `embedDocuments(texts)`
  for many texts — N separate `embedQuery()` calls multiply latency and cost.
- **Server-side only, gated.** The provider key stays on the API; embedding is
  billed per token, so auth + rate-limit any endpoint that embeds caller-supplied
  text.
- Most apps shouldn't call this directly: `@molecule/api-semantic-search` composes
  this bond with `@molecule/api-ai-vector-store` (index + query in one call), and
  `@molecule/api-ai-rag` builds grounded Q&A on top of both.
