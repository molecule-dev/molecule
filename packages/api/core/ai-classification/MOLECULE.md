# @molecule/api-ai-classification

Zero-shot AI text classification for molecule.dev.

Score a piece of text against a set of candidate labels using an LLM — no
training, no fixed taxonomy. The default `provider` exported here is a
batteries-included implementation that composes the swappable `ai` chat bond
(`@molecule/api-ai`): it prompts the bonded model to return strict JSON
scores, then normalizes them into a sorted `ClassifyResult`.

## Quick Start

```typescript
import { bond } from '@molecule/api-bond'
import { provider as anthropic } from '@molecule/api-ai-anthropic'
import { provider as classification, requireProvider } from '@molecule/api-ai-classification'

// Wire an AI provider + the classifier at startup.
bond('ai', anthropic)
bond('ai-classification', classification)

// Use it anywhere.
const result = await requireProvider().classify({
  text: 'Win a FREE $1000 gift card now!!!',
  labels: ['spam', 'ham'],
})
console.log(result.top)    // 'spam'
console.log(result.labels) // [{ label: 'spam', score: 0.98 }, { label: 'ham', score: 0.02 }]
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-classification
```

## API

### Interfaces

#### `AIClassificationConfig`

Config options for an AI classification bond.

```typescript
interface AIClassificationConfig {
  [key: string]: unknown
}
```

#### `AIClassificationProvider`

AI classification provider interface.

Implement (or bond the default `provider`) to give an app zero-shot text
classification. All providers return the same normalized `ClassifyResult`.

```typescript
interface AIClassificationProvider {
  /** Provider identifier. */
  readonly name: string

  /**
   * Classify `text` against the candidate `labels`, returning a normalized,
   * score-sorted result.
   *
   * @param input - The text, candidate labels, and options.
   * @returns The scored, sorted labels plus the top label and token usage.
   */
  classify(input: ClassifyInput): Promise<ClassifyResult>
}
```

#### `ClassifyInput`

Input to a single classification request.

```typescript
interface ClassifyInput {
  /** The text to classify. */
  text: string
  /** Candidate labels to score the text against (required, non-empty). */
  labels: string[]
  /** Allow multiple positive labels rather than a single winner (default `false`). */
  multiLabel?: boolean
  /** Extra guidance passed to the classifier (e.g. label definitions, tone). */
  instructions?: string
  /** Override the AI model used for this request. */
  model?: string
  /** Select a specific named AI provider (defaults to the bonded singleton). */
  provider?: string
  /** Abort signal to cancel the in-flight request. */
  signal?: AbortSignal
}
```

#### `ClassifyResult`

Result of a classification request.

```typescript
interface ClassifyResult {
  /** All candidate labels with scores, sorted descending by score. Only labels from the candidate set. */
  labels: LabelScore[]
  /** The highest-scoring label. */
  top: string
  /** Token usage reported by the underlying AI provider, when available. */
  usage?: TokenUsage
}
```

#### `LabelScore`

A single label with its confidence score in the range `0..1`.

```typescript
interface LabelScore {
  /** The candidate label. */
  label: string
  /** Confidence score in the range `0..1`. */
  score: number
}
```

### Functions

#### `getAllProviders()`

Retrieves all named AI classification providers as a Map keyed by name.

```typescript
function getAllProviders(): Map<string, AIClassificationProvider>
```

**Returns:** Map of provider name → AIClassificationProvider.

#### `getProvider()`

Retrieves the singleton AI classification provider, or `null` if none is bonded.

Falls back to a single named provider when no singleton is bonded. When
multiple named providers are bonded the fallback declines (returns `null`)
because the choice is ambiguous — use `getProviderByName(name)` instead.

```typescript
function getProvider(): AIClassificationProvider | null
```

**Returns:** The bonded AI classification provider, or `null`.

#### `getProviderByName(name)`

Retrieves a named AI classification provider, or `null` if not bonded.

```typescript
function getProviderByName(name: string): AIClassificationProvider | null
```

- `name` — The provider name.

**Returns:** The named AI classification provider, or `null`.

#### `hasProvider(name)`

Checks whether an AI classification provider is currently bonded.

```typescript
function hasProvider(name?: string): boolean
```

- `name` — Optional provider name. If omitted, checks the singleton.

**Returns:** `true` if the provider is bonded.

#### `requireProvider()`

Retrieves the bonded AI classification provider, throwing if none is bonded.

```typescript
function requireProvider(): AIClassificationProvider
```

**Returns:** The bonded AI classification provider.

#### `setProvider(provider)`

Registers an AI classification provider in singleton mode.

```typescript
function setProvider(provider: AIClassificationProvider): void
```

- `provider` — The default provider implementation for this process.

### Constants

#### `provider`

Default AI classification provider (`name: 'default'`).

Zero-shot classifier composed over the swappable `ai` chat bond. Bond it via
`bond('ai-classification', provider)` and it will resolve the bonded `ai`
provider lazily at call time, so swapping the AI provider automatically
swaps the classifier's backing model.

```typescript
const provider: AIClassificationProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

- **Requires a bonded `ai` provider.** `classify()` resolves the AI provider
  from the bond registry at call time via `@molecule/api-ai` — bond one
  (`bond('ai', anthropic)`) before classifying or it throws.
- **Swappable.** Both the classifier (`bond('ai-classification', ...)`) and
  the underlying model (`bond('ai', ...)`) are swappable at runtime; the
  default provider follows whichever `ai` provider is bonded.
- Pass `multiLabel: true` when several labels can apply at once, and
  `instructions` to give the model label definitions or extra guidance.
- `result.labels` is restricted to the candidate set, sorted descending by
  score; missing labels default to `0`. Unparseable model output throws (with
  an output snippet) rather than returning silent garbage.
