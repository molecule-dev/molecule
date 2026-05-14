# @molecule/api-ai-alibaba

Alibaba Qwen AI provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-alibaba
```

## API

### Interfaces

#### `AlibabaConfig`

Configuration for Alibaba Qwen.

```typescript
interface AlibabaConfig {
  /** API key. Defaults to DASHSCOPE_API_KEY env var. */
  apiKey?: string
  /** Default model. Defaults to 'qwen3-coder-plus'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /** Base URL override (for proxies). Defaults to 'https://dashscope.aliyuncs.com/compatible-mode'. */
  baseUrl?: string
}
```

#### `ProcessEnv`

Process Env interface.

```typescript
interface ProcessEnv {
  DASHSCOPE_API_KEY: string
}
```

### Functions

#### `createProvider(config)`

Creates an Alibaba Qwen AI provider instance.

```typescript
function createProvider(config?: AlibabaConfig): AIProvider
```

- `config` — Alibaba-specific configuration (API key, model, max tokens, base URL).

**Returns:** An `AIProvider` backed by the DashScope Chat Completions API.

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

- `DASHSCOPE_API_KEY` *(required)*
