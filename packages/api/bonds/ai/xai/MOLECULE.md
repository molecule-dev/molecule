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

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-ai'
import { provider } from '@molecule/api-ai-xai'

export function setupAiXai(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-ai` ^1.0.0
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
