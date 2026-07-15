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
