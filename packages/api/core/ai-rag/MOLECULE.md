# @molecule/api-ai-rag

`@molecule/api-ai-rag` — the Retrieval-Augmented Generation contract.

Defines the `AIRagProvider` interface (ingest / query / remove) plus its
input/result types, and the bond accessor (`setProvider` / `getProvider` /
`requireProvider` / …). It ships NO implementation — bond a concrete provider
such as `@molecule/api-ai-rag-llm`, which composes `@molecule/api-semantic-search`
(retrieval) with the bonded `@molecule/api-ai` chat provider (generation) to
answer questions grounded in your own documents.

Everything underneath is swappable via `bond()` — different embeddings, vector
store, chat model, or RAG strategy, with no consumer changes.

## Quick Start

```ts
import { setProvider as setEmbeddings } from '@molecule/api-ai-embeddings'
import { provider as embeddings } from '@molecule/api-ai-embeddings-openai'
import { setProvider as setVectorStore } from '@molecule/api-ai-vector-store'
import { provider as vectorStore } from '@molecule/api-ai-vector-store-memory'
import { bond } from '@molecule/api-bond'
import { provider as ai } from '@molecule/api-ai-anthropic'
import { provider as rag } from '@molecule/api-ai-rag-llm'
import { requireProvider } from '@molecule/api-ai-rag'

// Wire the retrieval + generation dependencies first, then RAG itself.
// ai-embeddings and ai-vector-store keep their OWN singletons — wire them with
// their packages' setProvider(); a generic bond('ai-embeddings', …) does NOT
// reach them and query()/ingest() would throw "not configured" at runtime.
setEmbeddings(embeddings)
setVectorStore(vectorStore)
bond('ai', ai)
bond('ai-rag', rag)

// Ingest a corpus.
await requireProvider().ingest({
  collection: 'handbook',
  documents: [
    { id: 'pto', text: 'Employees accrue 15 PTO days per year.' },
    { id: 'wfh', text: 'Remote work is allowed up to 3 days per week.' },
  ],
})

// Ask a grounded question.
const { answer, sources, usage } = await requireProvider().query({
  collection: 'handbook',
  query: 'How many PTO days do I get?',
  topK: 5,
})
// answer: "You accrue 15 PTO days per year [1]."  sources: [{ id: 'pto', … }]
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-rag @molecule/api-ai @molecule/api-ai-vector-store @molecule/api-bond @molecule/api-i18n @molecule/api-semantic-search
```

## API

### Interfaces

#### `AIRagConfig`

Config options for an AI RAG bond.

```typescript
interface AIRagConfig {
  [key: string]: unknown
}
```

#### `AIRagProvider`

Retrieval-Augmented Generation contract.

A provider ingests a document corpus, then answers questions grounded in the
most relevant retrieved chunks. The default provider composes
`@molecule/api-semantic-search` (retrieval) with the bonded `@molecule/api-ai`
chat provider (generation); swap either underlying bond without touching
consumers.

```typescript
interface AIRagProvider {
  /** Human-readable provider name (the default composed provider is `'default'`). */
  readonly name: string
  /**
   * Embed and index a corpus of documents into a collection.
   *
   * @param input - The collection, documents, and optional embedding model.
   * @returns The number of documents indexed and the embedding dimensionality.
   */
  ingest(input: IngestInput): Promise<IngestResult>
  /**
   * Retrieve the most relevant chunks for a question, then generate an answer
   * grounded in (and citing) them.
   *
   * @param input - The collection, question, and optional retrieval/generation overrides.
   * @returns The grounded answer, the retrieved sources, and token usage.
   */
  query(input: RagQueryInput): Promise<RagQueryResult>
  /**
   * Remove previously-ingested documents from a collection by their ids.
   *
   * @param input - The collection and the ids of the documents to remove.
   * @returns A promise that resolves once the documents have been deleted.
   */
  remove(input: RemoveInput): Promise<void>
}
```

#### `IngestInput`

Parameters for {@link AIRagProvider.ingest}.

```typescript
interface IngestInput {
  /** The collection/namespace to index the documents into. */
  collection: string
  /** The documents to embed and upsert. An empty array is a no-op. */
  documents: RagDocument[]
  /** Embedding model override (provider-specific). Falls back to the provider default. */
  model?: string
}
```

#### `IngestResult`

Result of {@link AIRagProvider.ingest}.

```typescript
interface IngestResult {
  /** Number of documents embedded and upserted. */
  indexed: number
  /** Dimensionality of the embedding vectors (0 when no documents were indexed). */
  dimension: number
}
```

#### `RagDocument`

A single document to ingest into a RAG collection.

```typescript
interface RagDocument {
  /** Stable unique identifier for this document (used as the vector record id). */
  id: string
  /** The document's text — embedded, stored, and returned as a source on retrieval. */
  text: string
  /** Arbitrary metadata stored alongside the vector and usable as a query filter. */
  metadata?: Record<string, unknown>
}
```

#### `RagQueryInput`

Parameters for {@link AIRagProvider.query}.

```typescript
interface RagQueryInput {
  /** The collection/namespace to retrieve context from. */
  collection: string
  /** The natural-language question to answer. */
  query: string
  /** Number of chunks to retrieve and ground the answer on (default 5). */
  topK?: number
  /** Optional metadata filters to narrow retrieval before scoring. */
  filter?: MetadataFilter[]
  /** Minimum similarity score threshold — retrieved chunks below this are excluded. */
  minScore?: number
  /** Extra system guidance appended to the grounding instructions for the answer. */
  system?: string
  /** AI chat model override (provider-specific). Falls back to the provider default. */
  model?: string
  /** Named AI provider to answer with. Omit to use the bonded singleton AI provider. */
  provider?: string
  /** Abort signal forwarded to the AI chat call to cancel in-flight generation. */
  signal?: AbortSignal
}
```

#### `RagQueryResult`

Result of {@link AIRagProvider.query}.

```typescript
interface RagQueryResult {
  /** The generated answer, grounded in and citing the retrieved sources. */
  answer: string
  /** The retrieved chunks the answer was grounded on, ranked most-similar first. */
  sources: SearchHit[]
  /** Token usage reported by the AI provider for the answer generation, if any. */
  usage?: TokenUsage
}
```

#### `RemoveInput`

Parameters for {@link AIRagProvider.remove}.

```typescript
interface RemoveInput {
  /** The collection/namespace to remove documents from. */
  collection: string
  /** Ids of the documents to remove. */
  ids: string[]
}
```

### Functions

#### `getAllProviders()`

Retrieves all named AI RAG providers as a Map keyed by provider name.

```typescript
function getAllProviders(): Map<string, AIRagProvider>
```

**Returns:** Map of provider name → AIRagProvider.

#### `getProvider()`

Retrieves the singleton AI RAG provider, or `null` if none is bonded.

Falls back to a single named provider when no singleton is bonded. When
multiple named providers are bonded the fallback declines (returns `null`)
because the choice is ambiguous — those call sites must use
`getProviderByName(name)` explicitly.

```typescript
function getProvider(): AIRagProvider | null
```

**Returns:** The bonded AI RAG provider, or `null`.

#### `getProviderByName(name)`

Retrieves a named AI RAG provider, or `null` if not bonded.

```typescript
function getProviderByName(name: string): AIRagProvider | null
```

- `name` — The provider name.

**Returns:** The named AI RAG provider, or `null`.

#### `hasProvider(name)`

Checks whether an AI RAG provider is currently bonded.

```typescript
function hasProvider(name?: string): boolean
```

- `name` — Optional provider name. If omitted, checks the singleton.

**Returns:** `true` if the provider is bonded.

#### `requireProvider()`

Retrieves the bonded AI RAG provider, throwing if none is bonded.

Routes through `getProvider()` so the same single-named-bond fallback applies.

```typescript
function requireProvider(): AIRagProvider
```

**Returns:** The bonded AI RAG provider.

#### `setProvider(provider)`

Registers the default AI RAG provider in singleton mode.

```typescript
function setProvider(provider: AIRagProvider): void
```

- `provider` — The default provider implementation for this process.

## Available Providers

| Provider | Package |
|----------|---------|
| Ai Rag | `@molecule/api-ai-rag-llm` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-ai-vector-store` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-semantic-search` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-ai-vector-store`
- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-semantic-search`

A RAG provider is not built in — bond one (e.g. `@molecule/api-ai-rag-llm`).
The `llm` provider needs THREE dependencies present at runtime: an `ai` chat
provider (generation) plus the `ai-embeddings` and `ai-vector-store` providers
(retrieval, via `@molecule/api-semantic-search`). **Wire each through its own
core's registration API:** `bond('ai', …)` works for the chat provider, but
`ai-embeddings` and `ai-vector-store` are local-singleton cores — they are wired
ONLY via their packages' `setProvider()` (a generic `bond('ai-embeddings', …)`
is silently ignored by their accessors). Wire all three before calling
`query`/`ingest`, or the underlying accessors throw. The whole capability is
swappable: `bond('ai-rag', myProvider)` replaces the default with your own
`AIRagProvider`.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] After ingesting a known document set, ask a question whose answer is
  IN the corpus: the returned answer USES the retrieved content — it states
  the specific fact from the source doc (with the [n] citation `query()`
  returns), NOT the base model's generic prior. If it's right only because
  the model already knew the fact, retrieval isn't actually wired.
- [ ] Retrieval genuinely runs — the answer tracks the corpus. Remove the
  source doc (`remove({ collection, ids })`) or ingest a corrected version,
  then re-ask: the answer changes or disappears; it must NOT keep reciting a
  fact whose document is gone.
- [ ] An out-of-corpus question is DECLINED ("I don't have information on
  that" / "not in the documents"), not answered from the model's own prior.
  This is the key RAG failure to catch — a confident, well-formed answer to a
  question no ingested document supports is a hallucination and fails the box.
- [ ] A newly ingested document is answerable immediately: `ingest()` one more
  doc, then ask about its content in the same session — it's retrieved with no
  rebuild or redeploy.
- [ ] Every source `query()` returns points to a really-ingested document
  (its `id`/text matches a `RagDocument` you actually ingested), and each [n]
  citation in the answer maps to one of those returned sources — no fabricated
  ids and no dangling [n] with no matching source.
- [ ] Retrieval is SCOPED to the caller's own data: a query resolves only the
  authenticated user's/tenant's `collection` (or metadata `filter`) and can
  NOT surface another tenant's private documents in `answer` or `sources`.
  Confirm by ingesting two tenants' docs and querying as one — the other's
  content never appears.
- [ ] The RAG call is server-side only — ingest/query run in an API route,
  and the embeddings/AI provider key is never shipped to or readable in the
  browser.
