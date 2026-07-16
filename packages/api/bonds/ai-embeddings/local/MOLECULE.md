# @molecule/api-ai-embeddings-local

Local (offline) ai-embeddings provider for molecule.dev.

Runs a small sentence-embedding model (default `bge-small-en-v1.5`, 384-dim)
in-process via Transformers.js (onnxruntime) — no API key, no per-call cost, and
no network at query time. Bond it once at startup, then use the
`@molecule/api-ai-embeddings` core anywhere.

## Quick Start

```ts
import { setProvider } from '@molecule/api-ai-embeddings'
import { provider } from '@molecule/api-ai-embeddings-local'

setProvider(provider) // at startup

// anywhere after:
import { requireProvider } from '@molecule/api-ai-embeddings'
const vector = await requireProvider().embedQuery('some text') // number[] (384 dims)
const vectors = await requireProvider().embedDocuments(['a', 'b']) // number[][]
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-embeddings-local @huggingface/transformers @molecule/api-ai-embeddings
```

## API

### Interfaces

#### `LocalEmbeddingsConfig`

Configuration for the local embeddings provider. Every field is optional and
has an env-var fallback, so the provider works with zero configuration.

```typescript
interface LocalEmbeddingsConfig {
  /**
   * Model id (Transformers.js / HuggingFace). Defaults to `Xenova/bge-small-en-v1.5`
   * (384-dim) or the `MOL_EMBEDDINGS_LOCAL_MODEL` env var.
   */
  model?: string
  /** Pooling strategy. Defaults to `cls` — bge models are trained for CLS pooling. */
  pooling?: LocalEmbeddingsPooling
  /** L2-normalize outputs so a dot product equals cosine similarity. Defaults to `true`. */
  normalize?: boolean
  /**
   * Directory Transformers.js caches downloaded weights in (or the
   * `MOL_EMBEDDINGS_LOCAL_CACHE_DIR` env var). Use a persistent path so the
   * one-time download survives restarts.
   */
  cacheDir?: string
  /**
   * Directory holding a pre-bundled model for fully-offline / air-gapped use (or
   * the `MOL_EMBEDDINGS_LOCAL_MODEL_PATH` env var). Setting it disables remote
   * fetch unless {@link allowRemoteModels} is explicitly `true`.
   */
  localModelPath?: string
  /**
   * Allow downloading the model from HuggingFace on first use. Defaults to `true`,
   * or `false` when {@link localModelPath} is set.
   */
  allowRemoteModels?: boolean
}
```

### Types

#### `LocalEmbeddingsPooling`

Pooling strategy applied to the model's token embeddings to produce one vector per input.

```typescript
type LocalEmbeddingsPooling = 'cls' | 'mean' | 'none'
```

### Functions

#### `createProvider(config)`

Create a local embeddings provider. Config falls back to env vars, so
`createProvider()` with no arguments works out of the box.

```typescript
function createProvider(config?: LocalEmbeddingsConfig): AIEmbeddingsProvider
```

- `config` — Optional model / pooling / cache configuration.

**Returns:** An {@link AIEmbeddingsProvider} backed by an in-process ONNX model.

### Constants

#### `provider`

The provider implementation. Bond it with the ai-embeddings core's
`setProvider`. Model loading is deferred until the first embedding call.

```typescript
const provider: AIEmbeddingsProvider
```

## Core Interface
Implements `@molecule/api-ai-embeddings` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai-embeddings'
import { provider } from '@molecule/api-ai-embeddings-local'

export function setupAiEmbeddingsLocal(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai-embeddings` >=1.0.0

### Runtime Dependencies

- `@huggingface/transformers`
- `@molecule/api-ai-embeddings`

- **The model loads lazily on the first embed call** (~a few seconds) and then
  stays resident (~200–300 MB RAM). Nothing loads if you never embed.
- **First use downloads the model (~34 MB) and caches it.** For fully-offline /
  air-gapped deployments, bundle the model and set `localModelPath` (or the
  `MOL_EMBEDDINGS_LOCAL_MODEL_PATH` env var) — that disables the remote fetch.
- Configure via `createProvider({ model, pooling, cacheDir, localModelPath })` or
  the `MOL_EMBEDDINGS_LOCAL_*` env vars. Outputs are L2-normalized, so a dot
  product equals cosine similarity.
- Pulls `@huggingface/transformers` + `onnxruntime-node` (~350 MB installed) — a
  real third-party dependency, unlike most `@molecule/*` packages. Add it only
  where you actually embed.

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
