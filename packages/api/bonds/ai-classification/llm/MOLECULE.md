# @molecule/api-ai-classification-llm

LLM-backed zero-shot text classifier for molecule.dev — composes the
swappable `ai` chat bond to score candidate labels.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-classification-llm
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
