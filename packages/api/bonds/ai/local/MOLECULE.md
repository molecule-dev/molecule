# @molecule/api-ai-local

Local (OpenAI-compatible) ai-local provider for molecule.dev.

Streams chat completions from any local inference server that speaks the
OpenAI `chat/completions` protocol (Ollama, LM Studio, llama.cpp, vLLM),
keyless by default.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-local @molecule/api-ai @molecule/api-bond @molecule/api-i18n @molecule/api-secrets
```

## API

### Interfaces

#### `LocalConfig`

Local (OpenAI-compatible) provider configuration.

```typescript
interface LocalConfig {
  /**
   * Base URL of the OpenAI-compatible endpoint, INCLUDING the version segment
   * (e.g. `http://localhost:11434/v1`). Overrides `LOCAL_AI_BASE_URL` /
   * `OLLAMA_BASE_URL`. Defaults to Ollama's `http://localhost:11434/v1`.
   */
  baseUrl?: string
  /**
   * Optional API key. Most local servers ignore auth; when omitted (and no
   * `LOCAL_AI_API_KEY` env var is set) no `Authorization` header is sent.
   */
  apiKey?: string
  /**
   * Default model when a call doesn't specify one. Overrides `LOCAL_AI_MODEL`.
   * Defaults to `llama3.1`.
   */
  model?: string
}
```

### Classes

#### `LocalAIProvider`

Local (OpenAI-compatible) chat provider implementing the `AIProvider`
interface. Mirrors `@molecule/api-ai-openai` so the same handler code can
dispatch to a local endpoint.

### Functions

#### `createProvider(config)`

Create a local (OpenAI-compatible) AI provider instance.

Constructs WITHOUT requiring any secret — local endpoints run keyless.

```typescript
function createProvider(config?: LocalConfig): AIProvider
```

- `config` — Local provider configuration.

**Returns:** An `AIProvider` backed by an OpenAI-compatible local endpoint.

### Constants

#### `aiLocalSecretDefinitions`

Optional secret/config overrides recognised by the local AI bond.

```typescript
const aiLocalSecretDefinitions: SecretDefinition[]
```

#### `provider`

The provider implementation. Constructs keyless — no secret required.

```typescript
const provider: AIProvider
```

## Core Interface
Implements `@molecule/api-ai` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { provider } from '@molecule/api-ai-local'

export function setupAiLocal(): void {
  bond('ai', 'local', provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-secrets`

**Error message disambiguation**: a plain 400 that ISN'T a context-length error (bad param,
malformed tool schema) gets its own non-retryable message distinct from the generic
"AI service error. Please try again." used for retryable failures.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual chat/AI screens, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip. The
sandbox HAS an AI provider bonded, so the flow runs live end-to-end; AI
output is NON-DETERMINISTIC, so assert on STRUCTURE/behavior, not exact text:
- [ ] A message sent through the real chat UI comes back as a RELEVANT AI
  reply — not an echo of the prompt, a hardcoded stub, or an empty bubble.
  Ask something with a checkable answer (e.g. "What is 2 + 2?") and confirm
  the response actually contains it ("4"), proving a live model answered.
- [ ] If the app streams, tokens render INCREMENTALLY — text grows word by
  word in the UI, not one final blob dumped after a long frozen spinner. (A
  streamed `chat()` yields `text` chunks then a final `done`; a single late
  blob means the reply was awaited whole and streaming is broken.)
- [ ] Multi-turn CONTEXT is preserved: a follow-up that refers back to the
  previous turn (e.g. after "2 + 2", ask "now double that" -> understood as
  8) works — proving the full `messages` history is sent, not just the last
  line.
- [ ] A provider failure (bad/missing key, rate limit, timeout) surfaces as
  a graceful in-UI error message, NOT a crash, blank screen, a spinner that
  never resolves, or an unhandled 500. Force one and watch the UI recover.
- [ ] The provider key + the provider call are SERVER-side only: the key
  never reaches the browser (check the network tab, the JS bundle, and page
  globals), and no route proxies arbitrary prompts to the model without auth
  + a token cap — an open AI endpoint is an unbounded bill and abuse vector.
