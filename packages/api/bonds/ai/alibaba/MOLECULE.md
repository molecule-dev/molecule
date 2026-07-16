# @molecule/api-ai-alibaba

Alibaba Qwen AI provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-alibaba @molecule/api-ai @molecule/api-bond @molecule/api-i18n @molecule/api-secrets
```

## API

### Interfaces

#### `AlibabaConfig`

Configuration for Alibaba Qwen.

```typescript
interface AlibabaConfig {
  /** API key. Defaults to the `DASHSCOPE_API_KEY` (or `ALIBABA_API_KEY`) env var. */
  apiKey?: string
  /** Default model. Defaults to 'qwen3.6-plus'. */
  defaultModel?: string
  /** Maximum tokens for completions. */
  maxTokens?: number
  /**
   * Base URL override (for proxies). Defaults to the `DASHSCOPE_BASE_URL` env
   * var, then 'https://dashscope-us.aliyuncs.com/compatible-mode'.
   */
  baseUrl?: string
}
```

#### `ProcessEnv`

Process env vars read by the Alibaba DashScope AI bond.

```typescript
interface ProcessEnv {
  /** Alibaba DashScope API key. */
  DASHSCOPE_API_KEY: string
  /** Alternate key env var (same value; checked after DASHSCOPE_API_KEY). */
  ALIBABA_API_KEY?: string
  /** Base URL override (for credential brokers / gateways). */
  DASHSCOPE_BASE_URL?: string
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

#### `aiAlibabaSecretDefinitions`

Secret definitions required by the Alibaba DashScope AI bond.

```typescript
const aiAlibabaSecretDefinitions: SecretDefinition[]
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
import { provider } from '@molecule/api-ai-alibaba'

export function setupAiAlibaba(): void {
  bond('ai', 'alibaba', provider)
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

- `DASHSCOPE_API_KEY` *(required)* — Alibaba DashScope API key
  - Setup: Create an API key in Alibaba Cloud Model Studio (DashScope).
  - Get it here: [https://www.alibabacloud.com/help/en/model-studio/get-api-key](https://www.alibabacloud.com/help/en/model-studio/get-api-key)
  - Example: `sk-...`

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bond`
- `@molecule/api-i18n`
- `@molecule/api-secrets`

Config: `DASHSCOPE_API_KEY` (or `ALIBABA_API_KEY`, SERVER-side only) plus an optional default
model id/base URL.

**Missing key fails fast**: the provider throws naming both accepted env vars on first use
(the exported `provider` is a lazy proxy, so this fires on the first `chat()` call, not at
bond/module-load time) — it never silently sends an empty key.

**Error message disambiguation**: a plain 400 that ISN'T a context-length/invalid-param error
already handled above gets its own non-retryable message distinct from the generic
"AI service error. Please try again." used for retryable failures.
