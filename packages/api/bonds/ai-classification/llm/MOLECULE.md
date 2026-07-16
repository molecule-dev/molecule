# @molecule/api-ai-classification-llm

LLM-backed zero-shot text classifier for molecule.dev — composes the
swappable `ai` chat bond to score candidate labels.

Prompts the bonded LLM to score the candidate labels as strict JSON, then
normalizes the result into a sorted, candidate-restricted `ClassifyResult`.
Because it resolves the `ai` provider lazily at call time, swapping the AI
provider automatically swaps the classifier's backing model.

## Quick Start

```typescript
import { bond } from '@molecule/api-bond'
import { provider as anthropic } from '@molecule/api-ai-anthropic'
import { provider as classification } from '@molecule/api-ai-classification-llm'
import { requireProvider } from '@molecule/api-ai-classification'

// Wire an AI provider + the classifier at startup.
bond('ai', anthropic)
bond('ai-classification', classification)

// Use it anywhere.
const result = await requireProvider().classify({
  text: 'Win a FREE $1000 gift card now!!!',
  labels: ['spam', 'ham'],
})
console.log(result.top)    // 'spam'
console.log(result.labels) // [{ label: 'spam', score: 0.98 }, ...]
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-classification-llm @molecule/api-ai @molecule/api-ai-classification @molecule/api-i18n
```

## API

### Constants

#### `provider`

LLM-backed AI classification provider (`name: 'llm'`).

Zero-shot classifier composed over the swappable `ai` chat bond. Bond it via
`bond('ai-classification', provider)` and it will resolve the bonded `ai`
provider lazily at call time, so swapping the AI provider automatically
swaps the classifier's backing model.

```typescript
const provider: AIClassificationProvider
```

## Core Interface
Implements `@molecule/api-ai-classification` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai-classification'
import { provider } from '@molecule/api-ai-classification-llm'

export function setupAiClassificationLlm(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-ai-classification` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-ai-classification`
- `@molecule/api-i18n`

- **Requires a bonded `ai` provider.** `classify()` resolves the AI provider
  from the bond registry at call time — bond one (`bond('ai', anthropic)`)
  before classifying, or pass `provider: '<name>'` to target a specific
  named AI provider. It throws if none is bonded.
- **Swappable.** Both the classifier (`bond('ai-classification', ...)`) and
  the underlying model (`bond('ai', ...)`) are swappable at runtime.
- Pass `multiLabel: true` when several labels can apply at once, and
  `instructions` to give the model label definitions or extra guidance.
- `result.labels` is restricted to the candidate set, sorted descending by
  score; missing labels default to `0` and out-of-range scores are clamped
  to `0..1`. Unparseable model output THROWS (with an output snippet) rather
  than returning silent garbage. Fenced ```json``` blocks and surrounding
  prose are tolerated.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Each flow that classifies content (tagging, routing, moderation,
  triage — whatever the app defines) runs it from the real UI and the
  returned `top` is one of the app's candidate `labels`, never free text,
  with a `score` in 0..1. The sandbox has a live AI provider, so assert on
  the actual result — never mock the classifier or hardcode a label.
- [ ] Assert BOTH directions with clear samples: a clearly-on-topic example
  lands in its expected class AND a clearly-different example lands in a
  different class. A classifier that returns the same label for every input
  is broken — one positive check alone does not prove it works.
- [ ] Ambiguity is treated as uncertain, not force-fit: when the app gates
  on a minimum confidence, a genuinely-ambiguous input yields a low winning
  `score` and is routed to the app's "unsure"/unlabeled path rather than
  silently assigned the top label.
- [ ] The label actually DRIVES app behavior (routes/filters/tags/badges the
  item), not just renders as text — verify the downstream effect in the UI,
  not only that a label appeared on screen.
- [ ] Empty or ambiguous input is handled without a crash or a blank screen
  (a visible "couldn't classify"/unlabeled state, not an unhandled error).
- [ ] The classify call runs SERVER-SIDE: it goes through the app's API and
  the AI provider key never reaches the browser — the Network tab shows no
  provider request or key issued from client code.
