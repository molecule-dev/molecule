# @molecule/api-ai-rag-llm

`@molecule/api-ai-rag-llm` — the default LLM-composed `ai-rag` provider.

Implements `@molecule/api-ai-rag`'s `AIRagProvider` contract by composing two
existing molecule capabilities rather than reimplementing them:

- **Retrieval** — `@molecule/api-semantic-search` (`indexDocuments` /
  `search` / `removeDocuments`), which composes the bonded `ai-embeddings`
  + `ai-vector-store` providers to embed a corpus and similarity-search it.
- **Generation** — the bonded `@molecule/api-ai` chat provider, prompted to
  answer using ONLY the retrieved context and to cite sources as `[n]`.

Bond it like any other capability, then `ingest(...)` a corpus and `query(...)`
it. Everything underneath is swappable via `bond()` — different embeddings,
vector store, or chat model, with no consumer changes. It is the interchangeable
default for the `ai-rag` core; swap `bond('ai-rag', myProvider)` to replace it.

## Quick Start

```ts
import { bond } from '@molecule/api-bond'
import { provider as embeddings } from '@molecule/api-ai-embeddings-openai'
import { provider as vectorStore } from '@molecule/api-ai-vector-store-memory'
import { provider as ai } from '@molecule/api-ai-anthropic'
import { requireProvider } from '@molecule/api-ai-rag'
import { provider as rag } from '@molecule/api-ai-rag-llm'

// Bond the retrieval + generation dependencies first, then RAG itself.
bond('ai-embeddings', embeddings)
bond('ai-vector-store', vectorStore)
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
`provider`

## Installation
```bash
npm install @molecule/api-ai-rag-llm @molecule/api-ai @molecule/api-ai-rag @molecule/api-i18n @molecule/api-semantic-search
```

## API

### Constants

#### `provider`

Default, batteries-included Retrieval-Augmented-Generation provider.

Composes `@molecule/api-semantic-search` for retrieval with the bonded
`@molecule/api-ai` chat provider for generation. Bond it with
`bond('ai-rag', provider)` after bonding an `ai` provider plus the
`ai-embeddings` + `ai-vector-store` providers that semantic-search needs.

```typescript
const provider: AIRagProvider
```

## Core Interface
Implements `@molecule/api-ai-rag` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai-rag'
import { provider } from '@molecule/api-ai-rag-llm'

export function setupAiRagLlm(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-ai-rag` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-semantic-search` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-ai-rag`
- `@molecule/api-i18n`
- `@molecule/api-semantic-search`

This provider needs THREE bonds present at runtime: a `ai` chat provider
(generation) plus the `ai-embeddings` and `ai-vector-store` providers
(retrieval, via `@molecule/api-semantic-search`). Bond those before calling
`query`/`ingest`, or the underlying accessors throw. `query` still calls the
model when retrieval returns zero chunks, but instructs it to say it has no
information rather than hallucinate. The whole capability is swappable:
`bond('ai-rag', myProvider)` replaces this composed default with your own
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
