# @molecule/api-ai-xai

xAI Grok AI provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-xai @molecule/api-ai @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `ProcessEnv`

Process Env interface.

```typescript
interface ProcessEnv {
  XAI_API_KEY: string
  /** Base URL override (for credential brokers / gateways). */
  XAI_BASE_URL?: string
}
```

#### `XaiConfig`

Configuration for xAI.

```typescript
interface XaiConfig {
  /** API key. Defaults to XAI_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'grok-code-fast-1'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://api.x.ai'. */
  baseUrl?: string
}
```

### Functions

#### `createProvider(config)`

Creates an xAI Grok AI provider instance.

```typescript
function createProvider(config?: XaiConfig): AIProvider
```

- `config` — xAI-specific configuration (API key, model, max tokens, base URL).

**Returns:** An `AIProvider` backed by the xAI Chat Completions API.

### Constants

#### `provider`

The provider implementation.

```typescript
const provider: AIProvider
```

## Core Interface
Implements `@molecule/api-ai` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { provider } from '@molecule/api-ai-xai'

export function setupAiXai(): void {
  bond('ai', 'xai', provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Environment Variables

- `XAI_API_KEY` *(required)* — xAI API key
  - Setup: Create an API key in the xAI console (API Keys page).
  - Get it here: [https://console.x.ai/](https://console.x.ai/)
  - Example: `xai-...`

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bond`
- `@molecule/api-i18n`

Config: `XAI_API_KEY` (SERVER-side only) plus an optional default model id/base URL.

**Missing `XAI_API_KEY` fails fast**: the provider throws naming the exact env var on first
use (the exported `provider` is a lazy proxy, so this fires on the first `chat()` call, not at
bond/module-load time) — it never silently sends an empty key.

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
