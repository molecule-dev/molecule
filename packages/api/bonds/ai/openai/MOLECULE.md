# @molecule/api-ai-openai

OpenAI (GPT) AI provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-openai @molecule/api-ai @molecule/api-bond @molecule/api-secrets
```

## API

### Interfaces

#### `OpenaiConfig`

OpenAI provider configuration.

```typescript
interface OpenaiConfig {
  /** Override the API key (defaults to `process.env.OPENAI_API_KEY`). */
  apiKey?: string
  /** Default model when callers don't specify one. */
  defaultModel?: string
  /** Default max output tokens. */
  maxTokens?: number
  /** Override the API base URL (for proxies / Azure). */
  baseUrl?: string
}
```

#### `ProcessEnv`

Environment variables read by this provider.

```typescript
interface ProcessEnv {
  /** OpenAI API key (required unless `config.apiKey` is passed). */
  OPENAI_API_KEY: string
  /** Base URL override (for proxies / Azure-compatible gateways). Defaults to `https://api.openai.com`. */
  OPENAI_BASE_URL?: string
}
```

### Classes

#### `OpenaiAIProvider`

OpenAI Chat Completions provider implementing the `AIProvider` interface.

### Functions

#### `createProvider(config)`

Create an OpenAI AI provider instance.

```typescript
function createProvider(config?: OpenaiConfig): AIProvider
```

- `config` — OpenAI-specific configuration.

**Returns:** An `AIProvider` backed by OpenAI's Chat Completions API.

### Constants

#### `aiOpenaiSecretDefinitions`

Secret definitions required by the OpenAI AI bond.

```typescript
const aiOpenaiSecretDefinitions: SecretDefinition[]
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
import { provider } from '@molecule/api-ai-openai'

export function setupAiOpenai(): void {
  bond('ai', 'openai', provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `OPENAI_API_KEY` *(required)* — OpenAI API key
  - Setup: Create a secret key on the OpenAI platform (API keys page).
  - Get it here: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - Example: `sk-proj-...`

### Runtime Dependencies

- `@molecule/api-ai`
- `@molecule/api-bond`
- `@molecule/api-secrets`

Config: `OPENAI_API_KEY` (SERVER-side only) plus an optional default model id/base URL.

**Missing `OPENAI_API_KEY` fails fast**: the provider throws naming the exact env var on
first use (the exported `provider` is a lazy proxy, so this fires on the first `chat()` call,
not at bond/module-load time) — it never silently sends an empty key.

**Error message disambiguation**: a plain 400 that ISN'T a context-length error (bad param,
malformed tool schema) gets its own non-retryable message distinct from the generic
"AI service error. Please try again." used for retryable failures.
