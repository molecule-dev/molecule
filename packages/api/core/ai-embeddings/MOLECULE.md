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
npm install @molecule/api-ai-embeddings @molecule/api-bond
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

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`

- **Wire it at startup with `setProvider(...)` — or the equivalent
  `bond('ai-embeddings', provider)`.** This core routes through the shared
  `@molecule/api-bond` registry, so either call registers the same provider and
  `validateBonds()` reports it as missing when unwired.
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

## E2E Tests

Integration checklist — drive the real flow (no mocks), adapt each item to
this app's actual data and features, and check every box off one by one. A
box you can't check is an integration bug to fix — not a skip. Embeddings are
infrastructure, so PROVE them through the feature they power (semantic search
/ "related items" / dedup) AND with a direct property check on the vectors:
- [ ] `embedQuery(text)` returns a non-empty numeric `number[]` of the model's
  fixed dimension, and every vector from `embed`/`embedDocuments` has that SAME
  length — no empty arrays, no `NaN`/`null` entries, and the length is identical
  across calls (a query and a document must be comparable).
- [ ] The semantic property holds — there is NO built-in similarity helper, so
  compute cosine similarity yourself (dot product over the two magnitudes): two
  related texts ("dog"/"puppy", or a query and a matching doc) score HIGH, two
  unrelated texts ("dog"/"quarterly taxes") score clearly LOWER. If every pair
  scores alike the vectors are dead — one positive check alone doesn't prove it.
- [ ] Ranking works: embed a query plus a handful of documents and sort by cosine
  similarity — the semantically closest document ranks ABOVE the unrelated ones.
  This ordering is the whole point; a query that ranks an off-topic doc first is broken.
- [ ] The feature built on it works end-to-end from the real UI: semantic search
  / "related items" / dedup returns results ranked by MEANING, not keyword — a
  search for a synonym or paraphrase finds the right item even when it shares NO
  words with the query (the case a plain text/keyword search would miss).
- [ ] Embedding is stable: the same text embedded twice yields (near-)identical
  vectors, so a stored index stays valid — re-embedding an item must not silently
  drift it out of its own neighborhood.
- [ ] Batching is order-preserving: `embedDocuments([a, b, c])` (or `embed({ input })`)
  returns exactly one vector per input in the SAME order — `embeddings[i]` is the
  vector for `input[i]`, never shuffled, merged, or dropped.
- [ ] Embedding runs SERVER-SIDE: the call goes through the app's API and the
  provider key never reaches the browser (no provider request or key in the
  Network tab). Any endpoint that embeds caller-supplied text is authenticated
  and rate-limited — an open embed endpoint is an unbounded per-token cost/abuse vector.
