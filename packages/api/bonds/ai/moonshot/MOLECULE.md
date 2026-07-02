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

- `MOONSHOT_API_KEY` *(required)* — Moonshot API key
  - Setup: Create an API key in the Moonshot AI console.
  - Get it here: [https://platform.moonshot.ai/console/api-keys](https://platform.moonshot.ai/console/api-keys)
  - Example: `sk-...`
