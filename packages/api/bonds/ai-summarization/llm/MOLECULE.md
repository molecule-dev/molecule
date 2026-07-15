# @molecule/api-ai-summarization-llm

Default (`llm`) AI summarization provider for molecule.dev.

Turns a block of text into a concise summary over whatever LLM the app has
bonded. It has no vendor of its own — it composes the swappable `ai` chat
bond (`@molecule/api-ai`) with a summarizer system prompt built from the
requested format / length / focus, so swapping the LLM swaps the summarizer.

## Quick Start

```typescript
import { provider as anthropic } from '@molecule/api-ai-anthropic'
import { requireProvider } from '@molecule/api-ai-summarization'
import { provider as summarization } from '@molecule/api-ai-summarization-llm'
import { bond } from '@molecule/api-bond'

// Wire the AI chat provider this composes, then bond the summarizer.
bond('ai', anthropic)
bond('ai-summarization', summarization)

// Use anywhere after startup.
const { summary, usage } = await requireProvider().summarize({
  text: longArticle,
  format: 'bullets',
  maxLength: 60,
  focus: 'the financial impact',
})
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-summarization-llm @molecule/api-ai @molecule/api-ai-summarization @molecule/api-i18n
```

## API

### Constants

#### `provider`

Default AI summarization provider.

Composes the bonded `ai` chat provider (`@molecule/api-ai`) — an AI provider
MUST be bonded first (`bond('ai', <provider>)`), or `summarize()` throws. Bond
it with `bond('ai-summarization', provider)`; swap in a custom
`AISummarizationProvider` to replace it without touching call sites.

```typescript
const provider: AISummarizationProvider
```

## Core Interface
Implements `@molecule/api-ai-summarization` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai-summarization'
import { provider } from '@molecule/api-ai-summarization-llm'

export function setupAiSummarizationLlm(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-ai-summarization` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-ai-summarization`
- `@molecule/api-i18n`

Composes the swappable `ai` bond: an `ai` provider MUST be bonded first
(`bond('ai', <provider>)`) or `summarize()` throws (a missing AI provider
throws at `summarize()` time, not at import). Pass `provider` on the input to
target a specific named `ai` provider. Because it is just prompt orchestration
over the bonded LLM, swapping the `ai` provider swaps the model behind every
summary without touching call sites.
