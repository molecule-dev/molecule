# @molecule/api-ai-minimax

MiniMax AI provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-minimax @molecule/api-ai @molecule/api-bond @molecule/api-i18n @molecule/api-secrets
```

## API

### Interfaces

#### `MiniMaxConfig`

Configuration for MiniMax.

```typescript
interface MiniMaxConfig {
  /** API key. Defaults to MINIMAX_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'minimax-m2.5'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://api.minimax.chat'. */
  baseUrl?: string
}
```

#### `ProcessEnv`

Process Env interface.

```typescript
interface ProcessEnv {
  MINIMAX_API_KEY: string
  /** Base URL override (for credential brokers / gateways). */
  MINIMAX_BASE_URL?: string
}
```

### Functions

#### `createProvider(config)`

Creates a MiniMax AI provider instance.

```typescript
function createProvider(config?: MiniMaxConfig): AIProvider
```

- `config` — MiniMax-specific configuration (API key, model, max tokens, base URL).

**Returns:** An `AIProvider` backed by the MiniMax Chat Completions API.

### Constants

#### `aiMinimaxSecretDefinitions`

Secret definitions required by the MiniMax AI bond.

```typescript
const aiMinimaxSecretDefinitions: SecretDefinition[]
```

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
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `MINIMAX_API_KEY` *(required)* — MiniMax API key
  - Setup: Create an interface key in the MiniMax platform user center.
  - Get it here: [https://platform.minimax.io/](https://platform.minimax.io/)

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-secrets`

Config: `MINIMAX_API_KEY` (SERVER-side only) plus an optional default model id/base URL.

**Missing `MINIMAX_API_KEY` fails fast**: the provider throws naming the exact env var on
first use (the exported `provider` is a lazy proxy, so this fires on the first `chat()` call,
not at bond/module-load time) — it never silently sends an empty key.

**Error message disambiguation**: a plain 400 that ISN'T a context-length error (bad param,
malformed tool schema) gets its own non-retryable message distinct from the generic
"AI service error. Please try again." used for retryable failures.
