# @molecule/api-ai-rag-qa

`@molecule/api-ai-rag-qa` — RAG (retrieval-augmented generation) Q&A
pipeline. Chunk source documents, embed them, store in the vector
bond, then answer questions grounded in retrieved sources.

Composes the existing `@molecule/api-ai`, `@molecule/api-ai-embeddings`,
and `@molecule/api-ai-vector-store` bonds — works with any provider
mix (Anthropic + OpenAI embeddings + pgvector, etc.).

Extracted from the rag-knowledge-base flagship.

## Quick Start

```ts
import { indexDocument, answerQuestion } from '@molecule/api-ai-rag-qa'

await indexDocument({
  collection: 'docs',
  documentId: 'getting-started',
  text: longMarkdown,
  metadata: { source: 'README.md' },
})

const { answer, sources } = await answerQuestion({
  collection: 'docs',
  question: 'How do I configure auth?',
})
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-ai-rag-qa @molecule/api-ai @molecule/api-ai-embeddings @molecule/api-ai-vector-store @molecule/api-bonds-default-express @molecule/api-database @molecule/api-i18n @molecule/api-middleware-validation express zod
npm install -D @types/express
```

## API

### Interfaces

#### `Chunk`

A chunk of source material to be embedded + indexed.

```typescript
interface Chunk {
  id: string
  text: string
  metadata?: Record<string, unknown>
}
```

#### `ChunkOptions`

Chunking options for `chunkText`.

```typescript
interface ChunkOptions {
  /** Max characters per chunk. Default 1000. */
  maxChars?: number
  /** Overlap characters between adjacent chunks. Default 200. */
  overlap?: number
  /** Prefer chunking at paragraph boundaries when possible. Default true. */
  preferParagraphs?: boolean
}
```

#### `GroundedAnswer`

Final grounded answer + the sources it cited.

```typescript
interface GroundedAnswer {
  answer: string
  sources: RetrievalHit[]
  /** Token / chunk count used for the prompt (for cost telemetry). */
  contextTokens?: number
}
```

#### `RetrievalHit`

A retrieval hit from the vector store.

```typescript
interface RetrievalHit {
  id: string
  text: string
  score: number
  metadata?: Record<string, unknown>
}
```

### Functions

#### `answerQuestion(opts)`

Full RAG round-trip: retrieve top-K chunks, format them as numbered
sources, and ground a generated answer in them.

```typescript
function answerQuestion(opts: { collection: string; question: string; topK?: number; filter?: MetadataFilter[]; promptTemplate?: string; model?: string; temperature?: number; }): Promise<GroundedAnswer>
```

#### `chunkText(text, opts?)`

Split a long text into overlapping chunks suitable for embedding.

Tries paragraph boundaries first, then sentence boundaries, then
character boundaries. Each chunk includes `overlap` characters from
the prior chunk to preserve context across boundaries.

```typescript
function chunkText(text: string, opts?: ChunkOptions): string[]
```

#### `deleteDocument(opts)`

Delete all chunks for a previously-indexed document.

```typescript
function deleteDocument(opts: { collection: string; documentId: string; maxChunks?: number; }): Promise<void>
```

#### `indexDocument(opts)`

Index a long document by chunking, embedding, and upserting to the vector store.

```typescript
function indexDocument(opts: { collection: string; documentId: string; text: string; metadata?: Record<string, unknown>; chunking?: ChunkOptions; }): Promise<string[]>
```

#### `retrieve(opts)`

Retrieve top-K most similar chunks for a query.

```typescript
function retrieve(opts: { collection: string; query: string; topK?: number; filter?: MetadataFilter[]; }): Promise<RetrievalHit[]>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bonds-default-express` ^1.0.0
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-middleware-validation` ^1.0.0
- `express` ^5.0.0
- `zod` ^4.0.0
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-ai-embeddings` ^1.0.0
- `@molecule/api-ai-vector-store` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-ai-embeddings`
- `@molecule/api-ai-vector-store`
- `@molecule/api-bonds-default-express`
- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-middleware-validation`
- `express`
- `zod`

Wiring — the three composed cores use TWO different mechanisms:
- `@molecule/api-ai-embeddings` and `@molecule/api-ai-vector-store` each
  keep their OWN singleton: wire each with THAT core's `setProvider(...)`
  (e.g. `setProvider(provider)` from `@molecule/api-ai-embeddings-local`).
  A generic `bond('ai-embeddings', …)` / `bond('ai-vector-store', …)` call
  is never seen by those cores — `indexDocument()` / `retrieve()` then throw
  "provider not configured" even though the bond call appeared to succeed.
- `@molecule/api-ai` (used by `answerQuestion`) IS registry-based:
  `bond('ai', provider)` or named providers work.

Vectors are only comparable within ONE embeddings model + dimension:
after switching embeddings providers/models, re-index the collection —
`retrieve()` against vectors from a different model returns meaningless
similarity scores, not an error.

`deleteDocument()` deletes constructed chunk ids (`<documentId>::0..N-1`,
default `maxChunks: 1000`) — pass a larger `maxChunks` if a document
chunked into more. `answerQuestion()` with zero retrieval hits resolves
with the literal "I don't know based on the provided sources." and
`sources: []` — no model call is made.
