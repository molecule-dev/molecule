# @molecule/api-ai-minimax

MiniMax AI provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-ai-minimax
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

- `MINIMAX_API_KEY` *(required)*
