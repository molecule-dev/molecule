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

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Summarizing a real long document through the app's UI returns a summary
  that is clearly SHORTER than the input and captures its key points — not a
  truncation of the first N characters, not an echo of the input, not empty.
  The sandbox has a live AI provider, so this runs for real; the output is
  non-deterministic, so assert on behavior (it is shorter, the main ideas are
  present), never on an exact string.
- [ ] A second, different document yields a genuinely different summary — not
  the same cached/boilerplate text — confirming each summary reflects the
  actual input rather than a canned response.
- [ ] The shape/length controls actually change the output: a smaller
  `maxLength` (approx target words) produces a shorter summary than a larger
  one, and switching `format` between 'paragraph', 'bullets', and 'tldr'
  visibly changes the structure (bullets render as a list, tldr is terser).
  If the app exposes only some of these, verify the ones it exposes.
- [ ] Edge inputs are handled, not silently mangled: empty or whitespace-only
  input does not crash and gives a clear "nothing to summarize" response; very
  long input (beyond the model's limit) either summarizes or fails with a
  visible, clear message — never a silent truncation that drops half the
  meaning.
- [ ] A provider failure (the AI request errors, is rate-limited, or times
  out) surfaces gracefully in the UI — a readable error, no blank screen, no
  crash, no uncaught 500.
- [ ] The summarize call runs server-side only: no AI key or provider secret
  is ever exposed to the browser. Confirm the request goes to this app's own
  API and the key never appears in network traffic or the client bundle.
