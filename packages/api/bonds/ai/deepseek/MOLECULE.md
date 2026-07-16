# @molecule/api-ai-deepseek

DeepSeek AI provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-deepseek @molecule/api-ai @molecule/api-bond @molecule/api-i18n @molecule/api-secrets
```

## API

### Interfaces

#### `DeepseekConfig`

Configuration for DeepSeek.

```typescript
interface DeepseekConfig {
  /** API key. Defaults to DEEPSEEK_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'deepseek-v4-flash'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://api.deepseek.com'. */
  baseUrl?: string
}
```

#### `ProcessEnv`

Process Env interface.

```typescript
interface ProcessEnv {
  DEEPSEEK_API_KEY: string
  /** Base URL override (for credential brokers / gateways). */
  DEEPSEEK_BASE_URL?: string
}
```

### Functions

#### `createProvider(config)`

Creates a DeepSeek AI provider instance.

```typescript
function createProvider(config?: DeepseekConfig): AIProvider
```

- `config` — DeepSeek-specific configuration (API key, model, max tokens, base URL).

**Returns:** An `AIProvider` backed by the DeepSeek Chat Completions API.

### Constants

#### `aiDeepseekSecretDefinitions`

Secret definitions required by the DeepSeek AI bond.

```typescript
const aiDeepseekSecretDefinitions: SecretDefinition[]
```

#### `DeepseekAIProvider`

Back-compat alias for the provider class (the scaffold exported this name).

```typescript
const DeepseekAIProvider: typeof DeepseekAIProviderImpl
```

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
import { provider } from '@molecule/api-ai-deepseek'

export function setupAiDeepseek(): void {
  bond('ai', 'deepseek', provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `DEEPSEEK_API_KEY` *(required)* — DeepSeek API key
  - Setup: Create an API key on the DeepSeek open platform.
  - Get it here: [https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)
  - Example: `sk-...`

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-secrets`

Config: `DEEPSEEK_API_KEY` (SERVER-side only) plus an optional default model id/base URL.

**Missing `DEEPSEEK_API_KEY` fails fast**: the provider throws naming the exact env var on
first use (the exported `provider` is a lazy proxy, so this fires on the first `chat()` call,
not at bond/module-load time) — it never silently sends an empty key.

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
