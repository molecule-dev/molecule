# @molecule/api-ai-embeddings

ai-embeddings core interface for molecule.dev.

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
