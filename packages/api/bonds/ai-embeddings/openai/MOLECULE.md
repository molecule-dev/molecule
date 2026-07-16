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
