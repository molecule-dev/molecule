# @molecule/api-ai-summarization

AI summarization for molecule.dev — concise summaries over any bonded LLM.

A *core* package: it defines the `AISummarizationProvider` contract and the
bond accessor only — zero concrete implementation. The batteries-included
default lives in the bond package `@molecule/api-ai-summarization-llm`, which
composes the swappable `ai` chat bond (`@molecule/api-ai`). Apps may bond that
default or any custom `AISummarizationProvider`.

## Quick Start

```typescript
import { provider as anthropic } from '@molecule/api-ai-anthropic'
import { requireProvider } from '@molecule/api-ai-summarization'
import { provider } from '@molecule/api-ai-summarization-llm'
import { bond } from '@molecule/api-bond'

// Wire the AI chat provider the default composes, then bond the summarizer.
bond('ai', anthropic)
bond('ai-summarization', provider)

// Use anywhere after startup.
const { summary, usage } = await requireProvider().summarize({
  text: longArticle,
  format: 'bullets',
  maxLength: 60,
  focus: 'the financial impact',
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-ai-summarization @molecule/api-ai @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `AISummarizationConfig`

Config options for an AI summarization bond.

```typescript
interface AISummarizationConfig {
  [key: string]: unknown
}
```

#### `AISummarizationProvider`

AI summarization provider interface.

Implemented by the batteries-included default (composing `@molecule/api-ai`)
or by a custom bond package. All implementations return the same normalized
`SummarizeResult` regardless of the LLM behind them.

```typescript
interface AISummarizationProvider {
  readonly name: string

  /**
   * Summarize the given text.
   *
   * @param input - The source text plus optional shape/length/focus controls.
   * @returns The summary and (when reported) token usage.
   */
  summarize(input: SummarizeInput): Promise<SummarizeResult>
}
```

#### `SummarizeInput`

Input for a summarize request.

```typescript
interface SummarizeInput {
  /** The source text to summarize. */
  text: string
  /** Approximate target length in words. */
  maxLength?: number
  /** Output shape. Defaults to `'paragraph'`. */
  format?: 'paragraph' | 'bullets' | 'tldr'
  /** Optional angle or extra instructions to steer the summary. */
  focus?: string
  /** AI model override, passed through to the AI provider. */
  model?: string
  /** Named AI provider to use; falls back to the bonded default when omitted. */
  provider?: string
  /** Abort signal to cancel the in-flight AI request. */
  signal?: AbortSignal
}
```

#### `SummarizeResult`

Result of a summarize request.

```typescript
interface SummarizeResult {
  /** The generated summary. */
  summary: string
  /** Token usage reported by the underlying AI provider, when available. */
  usage?: TokenUsage
}
```

### Functions

#### `getAllProviders()`

Retrieves all named AI summarization providers as a Map keyed by name.

```typescript
function getAllProviders(): Map<string, AISummarizationProvider>
```

**Returns:** Map of provider name → AISummarizationProvider.

#### `getProvider()`

Retrieves the singleton AI summarization provider, or `null` if none is bonded.

Falls back to a single named provider when no singleton is bonded — this lets
apps that wire `bond('ai-summarization', 'fast', provider)` directly still
work with the simple `getProvider()` / `requireProvider()` accessors. When
multiple named providers are bonded, the fallback declines (returns `null`)
because the choice is ambiguous.

```typescript
function getProvider(): AISummarizationProvider | null
```

**Returns:** The bonded AI summarization provider, or `null`.

#### `getProviderByName(name)`

Retrieves a named AI summarization provider, or `null` if not bonded.

```typescript
function getProviderByName(name: string): AISummarizationProvider | null
```

- `name` — The provider name.

**Returns:** The named provider, or `null`.

#### `hasProvider(name)`

Checks whether an AI summarization provider is currently bonded.

```typescript
function hasProvider(name?: string): boolean
```

- `name` — Optional provider name. If omitted, checks the singleton.

**Returns:** `true` if the provider is bonded.

#### `requireProvider()`

Retrieves the bonded AI summarization provider, throwing if none is bonded.

```typescript
function requireProvider(): AISummarizationProvider
```

**Returns:** The bonded provider.

#### `setProvider(provider)`

Registers an AI summarization provider in singleton mode.

- **Singleton**: `setProvider(provider)` — bonds a single default provider.

```typescript
function setProvider(provider: AISummarizationProvider): void
```

- `provider` — The default provider implementation for this process.

## Available Providers

| Provider | Package |
|----------|---------|
| Ai Summarization | `@molecule/api-ai-summarization-llm` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bond`
- `@molecule/api-i18n`

This core imports `@molecule/api-ai` only as a *type* (the shared `TokenUsage`
interface on `SummarizeResult`) — never for runtime use. A provider must be
bonded before `requireProvider()` resolves (it throws otherwise). Swap in a
custom `AISummarizationProvider` via `bond('ai-summarization', myProvider)`
without changing any call site.
