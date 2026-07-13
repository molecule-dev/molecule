# @molecule/api-ai-moonshot

Moonshot (Kimi) AI provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-moonshot
```

## API

### Interfaces

#### `MoonshotConfig`

Configuration for Moonshot.

```typescript
interface MoonshotConfig {
  /** API key. Defaults to MOONSHOT_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'kimi-k2.5'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://api.moonshot.cn'. */
  baseUrl?: string
}
```

#### `ProcessEnv`

Process Env interface.

```typescript
interface ProcessEnv {
  MOONSHOT_API_KEY: string
  /** Base URL override (for credential brokers / gateways). */
  MOONSHOT_BASE_URL?: string
}
```

### Functions

#### `createProvider(config)`

Creates a Moonshot (Kimi) AI provider instance.

```typescript
function createProvider(config?: MoonshotConfig): AIProvider
```

- `config` — Moonshot-specific configuration (API key, model, max tokens, base URL).

**Returns:** An `AIProvider` backed by the Moonshot Chat Completions API.

### Constants

#### `aiMoonshotSecretDefinitions`

Secret definitions required by the Moonshot AI bond.

```typescript
const aiMoonshotSecretDefinitions: SecretDefinition[]
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

- `MOONSHOT_API_KEY` *(required)* — Moonshot API key
  - Setup: Create an API key in the Moonshot AI console.
  - Get it here: [https://platform.moonshot.ai/console/api-keys](https://platform.moonshot.ai/console/api-keys)
  - Example: `sk-...`

Config: `MOONSHOT_API_KEY` (SERVER-side only) plus an optional default model id/base URL.

**Missing `MOONSHOT_API_KEY` fails fast**: the provider throws naming the exact env var on
first use (the exported `provider` is a lazy proxy, so this fires on the first `chat()` call,
not at bond/module-load time) — it never silently sends an empty key.

**Error message disambiguation**: a plain 400 that ISN'T a context-length error (bad param,
malformed tool schema) gets its own non-retryable message distinct from the generic
"AI service error. Please try again." used for retryable failures.
