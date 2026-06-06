# @molecule/api-ai-deepseek

DeepSeek AI provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-deepseek
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

### Environment Variables

- `DEEPSEEK_API_KEY` *(required)*
