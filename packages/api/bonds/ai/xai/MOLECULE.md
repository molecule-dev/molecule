# @molecule/api-ai-xai

xAI Grok AI provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-xai
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

Config: `XAI_API_KEY` (SERVER-side only) plus an optional default model id/base URL.

**Missing `XAI_API_KEY` fails fast**: the provider throws naming the exact env var on first
use (the exported `provider` is a lazy proxy, so this fires on the first `chat()` call, not at
bond/module-load time) — it never silently sends an empty key.

**Error message disambiguation**: a plain 400 that ISN'T a context-length error (bad param,
malformed tool schema) gets its own non-retryable message distinct from the generic
"AI service error. Please try again." used for retryable failures.
