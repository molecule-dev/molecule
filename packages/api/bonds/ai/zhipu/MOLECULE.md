# @molecule/api-ai-zhipu

Zhipu GLM AI provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-zhipu
```

## API

### Interfaces

#### `ProcessEnv`

Process Env interface.

```typescript
interface ProcessEnv {
  ZHIPU_API_KEY: string
  /** Base URL override (for credential brokers / gateways). */
  ZHIPU_BASE_URL?: string
}
```

#### `ZhipuConfig`

Configuration for Zhipu.

```typescript
interface ZhipuConfig {
  /** API key. Defaults to ZHIPU_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'glm-5'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://open.bigmodel.cn/api/paas'. */
  baseUrl?: string
}
```

### Functions

#### `createProvider(config)`

Creates a Zhipu GLM AI provider instance.

```typescript
function createProvider(config?: ZhipuConfig): AIProvider
```

- `config` — Zhipu-specific configuration (API key, model, max tokens, base URL).

**Returns:** An `AIProvider` backed by the Zhipu Chat Completions API.

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

### Environment Variables

- `ZHIPU_API_KEY` *(required)*
